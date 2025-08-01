/* Copyright Contributors to the Open Cluster Management project */
import get from 'get-value'
import { logger } from '../../lib/logger'
import {
  ApplicationKind,
  ArgoApplicationApiVersion,
  ArgoApplicationKind,
  Cluster,
  IApplicationSet,
  IResource,
} from '../../resources/resource'
import { getKubeResources, getHubClusterName } from '../events'
import {
  applicationCache,
  ApplicationCacheType,
  getAppDict,
  IArgoApplication,
  IQuery,
  ITransformedResource,
  SEARCH_QUERY_LIMIT,
} from './applications'
import {
  cacheRemoteApps,
  getClusters,
  getNextApplicationPageChunk,
  ApplicationPageChunk,
  transform,
  getApplicationType,
  getApplicationClusters,
  getTransform,
} from './utils'
import { deflateResource } from '../../lib/compression'
import { IWatchOptions } from '../../resources/watch-options'

interface IArgoAppLocalResource extends IResource {
  spec: {
    destination: {
      name?: string
      namespace: string
      server?: string
    }
  }
  status?: {
    resources: [{ namespace: string }]
  }
}

export interface IArgoAppRemoteResource {
  _uid: string
  _hostingResource: string
  name: string
  namespace: string
  created: string
  destinationNamespace: string
  destinationName: string
  destinationCluster: string
  destinationServer: string
  path: string
  repoURL: string
  targetRevision: string
  chart: string
  cluster: string
  healthStatus: string
  syncStatus: string
}

let hubClusterName: string
let clusters: Cluster[]
let localCluster: Cluster
let placementDecisions: IResource[]

// APPSETS ARE ALL ON HUB as KUBERNETES RESOURCES
// for PUSH APPSETS, APPS ARE ON HUB (kube) but pushed to anywhere (hub/cluster)
// for PULL APPSETS, APPS ARE ONLY REMOTE (SEARCH api), but can be pulled into local

// MAINTAINING A MAP OF PUSHED APPSETS AND THEIR APPS (from kube)
// we create this map by looping through all local argo apps, getting its owner reference appset name,
// and adding it to the map with the appset name as the key and the app as a value array
let pushedAppSetMap: Record<string, IArgoApplication[]> = {}
let tempPushedAppSetMap: Record<string, IArgoApplication[]> = {}
export function getPushedAppSetMap() {
  return pushedAppSetMap || {}
}

// MAINTAINING A MAP OF PULLED APPSETS AND THEIR APPS (from search)
// we create this map by looping through all searched argo apps
// there is no owner reference, but a search record has a _hostingResource
//  which constains the same information as the owner reference
//   as 'ApplicationSet/openshift-gitops/fernando-2'
let pulledAppSetMap: Record<string, IArgoAppRemoteResource[]> = {}
let tempPulledAppSetMap: Record<string, IArgoAppRemoteResource[]> = {}
export function getPulledAppSetMap() {
  return Object.keys(pulledAppSetMap).length === 0 ? tempPulledAppSetMap : pulledAppSetMap || {}
}

// filter out ocp apps that are argo apps
// each entry is a string of the form:
// <argo app name>-<argo app namespace>-<argo app cluster>
const ocpArgoAppFilter: Set<string> = new Set()

// in case there are lots of argo apps, instead of searching all at once,
// we search in chunks of 1000 apps at a time
let argoPageChunk: ApplicationPageChunk
const argoPageChunks: ApplicationPageChunk[] = []

const oldResourceUidSets: Record<string, Set<string>> = {}

export function addArgoQueryInputs(applicationCache: ApplicationCacheType, query: IQuery) {
  argoPageChunk = getNextApplicationPageChunk(applicationCache, argoPageChunks, 'remoteArgoApps')
  const filters = [
    {
      property: 'kind',
      values: ['Application'],
    },
    {
      property: 'apigroup',
      values: ['argoproj.io'],
    },
    {
      property: 'cluster',
      values: [`!${getHubClusterName()}`],
    },
  ]
  /* istanbul ignore if */
  if (argoPageChunk?.keys) {
    filters.push({
      property: 'name',
      values: argoPageChunk.keys,
    })
  }
  query.variables.input.push({
    filters,
    limit: SEARCH_QUERY_LIMIT,
  })
}

export function cacheArgoApplications(applicationCache: ApplicationCacheType, remoteArgoApps: IResource[]) {
  const hubClusterName = getHubClusterName()
  const clusters: Cluster[] = getClusters()
  const localCluster = clusters.find((cls) => cls.name === hubClusterName)

  // should be rarely used, argo apps are usually created by appsets
  if (applicationCache['localArgoApps']?.resourceUidMap) {
    try {
      const localArgoAppsMap = applicationCache['localArgoApps'].resourceUidMap
      transform(Object.values(localArgoAppsMap), false, localCluster, clusters, localArgoAppsMap)
    } catch (e) {
      logger.error(`getLocalArgoApps exception ${e}`)
    }
  }
  try {
    // cache remote argo apps
    cacheRemoteApps(
      applicationCache,
      getRemoteArgoApps(ocpArgoAppFilter, remoteArgoApps),
      argoPageChunk,
      'remoteArgoApps'
    )
  } catch (e) {
    logger.error(`cacheRemoteApps exception ${e}`)
  }

  if (applicationCache['appset']?.resourceUidMap) {
    try {
      const appsetMap = applicationCache['appset'].resourceUidMap
      transform(Object.values(appsetMap), false, localCluster, clusters, appsetMap)
    } catch (e) {
      logger.error(`aggregateLocalApplications appset exception ${e}`)
    }
  }

  return ocpArgoAppFilter
}

export function polledArgoApplicationAggregation(
  options: IWatchOptions,
  items: ITransformedResource[],
  shouldPostProcess: boolean
): void {
  const { kind } = options

  // get resourceUidMap
  const appKey = kind === ApplicationKind ? 'localArgoApps' : 'appset'
  let resourceUidMap = applicationCache[appKey]?.resourceUidMap
  if (!resourceUidMap) {
    delete applicationCache[appKey].resources
    resourceUidMap = applicationCache[appKey].resourceUidMap = {}
  }

  // initialize data for this pass (pass continues until shouldPostProcess)
  if (!oldResourceUidSets[appKey]) {
    oldResourceUidSets[appKey] = new Set(Object.keys(resourceUidMap))
    hubClusterName = getHubClusterName()
    clusters = getClusters()
    localCluster = clusters.find((cls) => cls.name === hubClusterName)
    placementDecisions = getKubeResources('PlacementDecision', 'cluster.open-cluster-management.io/v1beta1')
  }

  // filter out apps that belong to an appset
  if (kind === ApplicationKind) {
    items = filterArgoApps(items, clusters, ocpArgoAppFilter, tempPushedAppSetMap)
  }

  // add uidata transforms
  items.forEach((item) => {
    const uid = get(item, 'metadata.uid') as string
    let transform = resourceUidMap[uid]?.transform
    if (!transform) {
      const type = getApplicationType(item)
      const _clusters = getApplicationClusters(item, type, [], placementDecisions, localCluster, clusters)
      transform = getTransform(item, type, _clusters)
    }
    resourceUidMap[uid] = { compressed: deflateResource(item, getAppDict()), transform }
    oldResourceUidSets[appKey].delete(uid)
  })

  if (shouldPostProcess) {
    // cleanup resourceUidMap
    for (const uid of oldResourceUidSets[appKey]) {
      delete resourceUidMap[uid]
    }
    delete oldResourceUidSets[appKey]

    // we have built up a map of appsets -> a list of its argo apps
    // if argo apps have finished polling, set that temp appset map into the real one
    // the real one will be used while a new temp map is being created
    // this fixes the problem where the argo app moves to a new appset of the same name in a new cluster
    if (kind === ApplicationKind) {
      pushedAppSetMap = tempPushedAppSetMap
      tempPushedAppSetMap = {}
    }
  }
}

function filterArgoApps(
  items: IResource[],
  clusters: Cluster[],
  ocpAppSetFilter: Set<string>,
  pushedAppSetMap: Record<string, IResource[]>
) {
  return items.filter((app) => {
    const argoApp = app as IArgoAppLocalResource
    const resources = argoApp.status ? argoApp.status.resources : undefined
    const definedNamespace = resources?.[0].namespace

    // cache Argo app signature for filtering OCP apps later
    ocpAppSetFilter.add(
      `${argoApp.metadata.name}-${
        definedNamespace ?? argoApp.spec.destination.namespace
      }-${getArgoDestinationCluster(argoApp.spec.destination, clusters, getHubClusterName())}`
    )
    const isChildOfAppset =
      argoApp.metadata.ownerReferences && argoApp.metadata?.ownerReferences[0].kind === 'ApplicationSet'
    if (!argoApp.metadata.ownerReferences || !isChildOfAppset) {
      return true
    }
    const appSetName = get(argoApp, ['metadata', 'ownerReferences', '0', 'name']) as string
    let apps = pushedAppSetMap[appSetName]
    if (!apps) {
      apps = pushedAppSetMap[appSetName] = []
    }
    const inx = apps.findIndex((itm) => itm.metadata.uid === app.metadata.uid)
    if (inx !== -1) {
      apps[inx] = app
    } else {
      apps.push(app)
    }
    return false
  })
}

function getRemoteArgoApps(ocpAppSetFilter: Set<string>, remoteArgoApps: IResource[]) {
  const argoApps = remoteArgoApps as unknown as IArgoAppRemoteResource[]
  const apps: IResource[] = []

  // since searched argo apps can be spread out into multiple searches
  // we build up a temp map, and when the next search is done, we copy it to the real map
  // this can happen because the search is done in chunks of 1000 apps at a time
  if (argoPageChunks.length === 0) {
    pulledAppSetMap = tempPulledAppSetMap
    tempPulledAppSetMap = {}
  }

  argoApps.forEach((argoApp: IArgoAppRemoteResource) => {
    // cache Argo app signature for filtering OCP apps later
    ocpAppSetFilter.add(`${argoApp.name}-${argoApp.destinationNamespace}-${argoApp.cluster}`)
    if (argoApp._hostingResource) {
      const [kind, , appSetName] = argoApp._hostingResource.split('/')
      if (kind === 'ApplicationSet') {
        let apps = tempPulledAppSetMap[appSetName]
        if (!apps) {
          apps = tempPulledAppSetMap[appSetName] = []
        }
        const inx = apps.findIndex((itm) => itm._uid === argoApp._uid)
        if (inx !== -1) {
          apps[inx] = argoApp
        } else {
          apps.push(argoApp)
        }
      }
    } else {
      // Skip apps created by Argo pull model
      apps.push({
        apiVersion: ArgoApplicationApiVersion,
        kind: ArgoApplicationKind,
        metadata: {
          name: argoApp.name,
          namespace: argoApp.namespace,
          creationTimestamp: argoApp.created,
        },
        spec: {
          destination: {
            namespace: argoApp.destinationNamespace,
            name: argoApp.destinationName,
            server: argoApp.destinationCluster || argoApp.destinationServer,
          },
          source: {
            path: argoApp.path,
            repoURL: argoApp.repoURL,
            targetRevision: argoApp.targetRevision,
            chart: argoApp.chart,
          },
        },
        status: {
          cluster: argoApp.cluster,
          health: {
            status: argoApp.healthStatus,
          },
          sync: {
            status: argoApp.syncStatus,
          },
        },
      } as IResource)
    }
  })

  return apps
}

function getArgoDestinationCluster(
  destination: { name?: string; namespace: string; server?: string },
  clusters: Cluster[],
  cluster?: string
) {
  // cluster is the name of the managed cluster where the Argo app is defined
  let clusterName = ''
  const serverApi = destination?.server
  if (serverApi) {
    /* istanbul ignore if */
    if (serverApi === 'https://kubernetes.default.svc') {
      clusterName = cluster ?? getHubClusterName()
    } else {
      const server = clusters.find((cls) => cls.kubeApiServer === serverApi)
      /* istanbul ignore next */ clusterName = server ? server.name : 'unknown'
    }
  } else {
    // target destination was set using the name property
    /* istanbul ignore next */ clusterName = destination?.name || 'unknown'
    /* istanbul ignore next */ if (cluster && (clusterName === 'in-cluster' || clusterName === getHubClusterName())) {
      clusterName = cluster
    }

    /* istanbul ignore next */ if (clusterName === 'in-cluster') {
      clusterName = getHubClusterName()
    }
  }
  return clusterName
}

const appSetPlacementStr = [
  'clusterDecisionResource',
  'labelSelector',
  'matchLabels',
  'cluster.open-cluster-management.io/placement',
]
export function getAppSetRelatedResources(appSet: IResource, applicationSets: IApplicationSet[]) {
  const appSetsSharingPlacement: string[] = []
  const currentAppSetGenerators = (appSet as IApplicationSet).spec?.generators
  /* istanbul ignore next */
  const currentAppSetPlacement = currentAppSetGenerators
    ? (get(currentAppSetGenerators[0], appSetPlacementStr, { default: '' }) as string)
    : undefined

  /* istanbul ignore if */
  if (!currentAppSetPlacement) {
    return ['', []]
  }

  applicationSets.forEach((item) => {
    const appSetGenerators = item.spec.generators
    /* istanbul ignore next */
    const appSetPlacement = appSetGenerators
      ? (get(appSetGenerators[0], appSetPlacementStr, { default: '' }) as string)
      : ''
    /* istanbul ignore if */
    if (
      item.metadata.name !== appSet.metadata?.name ||
      (item.metadata.name === appSet.metadata?.name && item.metadata.namespace !== appSet.metadata?.namespace)
    ) {
      if (appSetPlacement && appSetPlacement === currentAppSetPlacement && item.metadata.name) {
        appSetsSharingPlacement.push(item.metadata.name)
      }
    }
  })

  return [currentAppSetPlacement, appSetsSharingPlacement]
}
