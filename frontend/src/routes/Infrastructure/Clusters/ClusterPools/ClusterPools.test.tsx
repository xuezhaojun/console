/* Copyright Contributors to the Open Cluster Management project */

import {
  ClusterClaim,
  ClusterClaimApiVersion,
  ClusterClaimKind,
  ClusterImageSet,
  ClusterImageSetApiVersion,
  ClusterImageSetKind,
  ClusterPool,
  ClusterPoolApiVersion,
  ClusterPoolKind,
} from '../../../../resources'
import { Cluster, ClusterStatus } from '../../../../resources/utils'

import { render, screen } from '@testing-library/react'
import { Scope } from 'nock/types'
import { MemoryRouter } from 'react-router-dom-v5-compat'
import { RecoilRoot } from 'recoil'
import { clusterClaimsState, clusterImageSetsState, clusterPoolsState } from '../../../../atoms'
import {
  nockCreate,
  nockDelete,
  nockGet,
  nockIgnoreApiPaths,
  nockIgnoreRBAC,
  nockPatch,
} from '../../../../lib/nock-util'
import {
  clickBulkAction,
  clickByLabel,
  clickByText,
  clickRowKebabAction,
  getCSVDownloadLink,
  getCSVExportSpies,
  selectTableRow,
  typeByTestId,
  typeByText,
  waitForNocks,
  waitForText,
} from '../../../../lib/test-util'
import ClusterPoolsPage, { ClusterPoolsTable } from './ClusterPools'
import { Provider } from '../../../../ui-components'

const mockClusterImageSet: ClusterImageSet = {
  apiVersion: ClusterImageSetApiVersion,
  kind: ClusterImageSetKind,
  metadata: {
    name: 'test-cluster-image-set',
    labels: {
      visible: 'true',
    },
  },
  spec: {
    releaseImage: 'release-image',
  },
}

const mockClusterPool: ClusterPool = {
  apiVersion: ClusterPoolApiVersion,
  kind: ClusterPoolKind,
  metadata: {
    name: 'test-pool',
    namespace: 'test-pool-namespace',
    uid: 'abc',
    finalizers: ['hive.openshift.io/clusters'],
  },
  spec: {
    baseDomain: 'dev.test-pool.com',
    imageSetRef: {
      name: 'img4.7.4-x86-64',
    },
    installConfigSecretTemplateRef: {
      name: 'test-pool-install-config',
    },
    platform: {
      aws: {
        credentialsSecretRef: {
          name: 'test-pool-aws-creds',
        },
        region: 'us-east-1',
      },
    },
    pullSecretRef: {
      name: 'test-pool-pull-secret',
    },
    size: 2,
    runningCount: 2,
  },
  status: {
    conditions: [
      {
        message: 'There is capacity to add more clusters to the pool.',
        reason: 'Available',
        status: 'True',
        type: 'CapacityAvailable',
      },
      {
        message: 'Dependencies verified',
        reason: 'Verified',
        status: 'False',
        type: 'MissingDependencies',
      },
    ],
    ready: 1,
    standby: 1,
    size: 2,
  },
}

const mockClusterPoolStandbyOnly: ClusterPool = {
  apiVersion: ClusterPoolApiVersion,
  kind: ClusterPoolKind,
  metadata: {
    name: 'test-pool-standby',
    namespace: 'test-pool-namespace',
    uid: 'xyz',
    finalizers: ['hive.openshift.io/clusters'],
  },
  spec: {
    baseDomain: 'dev.test-pool.com',
    imageSetRef: {
      name: 'img4.7.4-x86-64',
    },
    installConfigSecretTemplateRef: {
      name: 'test-pool-install-config',
    },
    platform: {
      aws: {
        credentialsSecretRef: {
          name: 'test-pool-aws-creds',
        },
        region: 'us-east-1',
      },
    },
    pullSecretRef: {
      name: 'test-pool-pull-secret',
    },
    size: 2,
  },
  status: {
    conditions: [
      {
        message: 'There is capacity to add more clusters to the pool.',
        reason: 'Available',
        status: 'True',
        type: 'CapacityAvailable',
      },
      {
        message: 'Dependencies verified',
        reason: 'Verified',
        status: 'False',
        type: 'MissingDependencies',
      },
    ],
    standby: 2,
    size: 2,
  },
}

const mockClusterPoolPending: ClusterPool = {
  apiVersion: ClusterPoolApiVersion,
  kind: ClusterPoolKind,
  metadata: {
    name: 'test-pool-pending',
    namespace: 'test-pool-namespace',
    uid: 'xyz',
    finalizers: ['hive.openshift.io/clusters'],
  },
  spec: {
    baseDomain: 'dev.test-pool.com',
    imageSetRef: {
      name: 'img4.7.4-x86-64',
    },
    installConfigSecretTemplateRef: {
      name: 'test-pool-install-config',
    },
    platform: {
      aws: {
        credentialsSecretRef: {
          name: 'test-pool-aws-creds',
        },
        region: 'us-east-1',
      },
    },
    pullSecretRef: {
      name: 'test-pool-pull-secret',
    },
    size: 1,
  },
  status: {
    conditions: [
      {
        message: 'There is capacity to add more clusters to the pool.',
        reason: 'Available',
        status: 'True',
        type: 'CapacityAvailable',
      },
      {
        message: 'Dependencies verified',
        reason: 'Verified',
        status: 'False',
        type: 'MissingDependencies',
      },
    ],
    standby: 1,
    size: 1,
  },
}

const clusterName = 'test-cluster'

const mockCluster: Cluster = {
  name: clusterName,
  displayName: clusterName,
  namespace: clusterName,
  uid: clusterName,
  status: ClusterStatus.ready,
  distribution: {
    k8sVersion: '1.19',
    ocp: undefined,
    displayVersion: '1.19',
    isManagedOpenShift: false,
  },
  labels: undefined,
  kubeApiServer: '',
  consoleURL: '',
  hive: {
    isHibernatable: true,
    clusterPool: mockClusterPool.metadata.name,
    clusterClaimName: 'test',
    secrets: {
      installConfig: '',
    },
  },
  isHive: true,
  isManaged: true,
  isCurator: false,
  hasAutomationTemplate: false,
  isHostedCluster: false,
  isSNOCluster: false,
  isRegionalHubCluster: false,
  owner: {},
  kubeconfig: '',
  kubeadmin: '',
  isHypershift: false,
  provider: Provider.aws,
  nodes: {
    ready: 0,
    unhealthy: 0,
    unknown: 0,
    nodeList: [
      {
        name: 'ip-10-0-134-240.ec2.internal',
        labels: {
          'beta.kubernetes.io/instance-type': 'm5.xlarge',
          'failure-domain.beta.kubernetes.io/region': 'us-west-1',
          'failure-domain.beta.kubernetes.io/zone': 'us-east-1c',
          'node-role.kubernetes.io/worker': '',
          'node.kubernetes.io/instance-type': 'm5.xlarge',
        },
        conditions: [
          {
            status: 'True',
            type: 'Ready',
          },
        ],
      },
      {
        name: 'ip-10-0-134-241.ec2.internal',
        labels: {
          'beta.kubernetes.io/instance-type': 'm5.xlarge',
          'failure-domain.beta.kubernetes.io/region': 'us-west-1',
          'failure-domain.beta.kubernetes.io/zone': 'us-east-1c',
          'node-role.kubernetes.io/worker': '',
          'node.kubernetes.io/instance-type': 'm5.xlarge',
        },
        conditions: [
          {
            status: 'True',
            type: 'Ready',
          },
        ],
      },
      {
        name: 'ip-10-0-134-242.ec2.internal',
        labels: {
          'beta.kubernetes.io/instance-type': 'm5.xlarge',
          'failure-domain.beta.kubernetes.io/region': 'us-west-1',
          'failure-domain.beta.kubernetes.io/zone': 'us-east-1c',
          'node-role.kubernetes.io/worker': '',
          'node.kubernetes.io/instance-type': 'm5.xlarge',
        },
        conditions: [
          {
            status: 'True',
            type: 'Ready',
          },
        ],
      },
      {
        name: 'ip-10-0-130-30.ec2.internal',
        labels: {
          'beta.kubernetes.io/instance-type': 'm5.xlarge',
          'failure-domain.beta.kubernetes.io/region': 'us-east-1',
          'failure-domain.beta.kubernetes.io/zone': 'us-east-1a',
          'node-role.kubernetes.io/master': '',
          'node.kubernetes.io/instance-type': 'm5.xlarge',
        },
        capacity: {
          cpu: '4',
          memory: '15944104Ki',
        },
        conditions: [
          {
            status: 'Unknown',
            type: 'Ready',
          },
        ],
      },
      {
        name: 'ip-10-0-151-254.ec2.internal',
        labels: {
          'beta.kubernetes.io/instance-type': 'm5.xlarge',
          'failure-domain.beta.kubernetes.io/region': 'us-south-1',
          'failure-domain.beta.kubernetes.io/zone': 'us-east-1b',
          'node-role.kubernetes.io/master': '',
          'node.kubernetes.io/instance-type': 'm5.xlarge',
        },
        capacity: {
          cpu: '4',
          memory: '8194000Pi',
        },
        conditions: [
          {
            status: 'False',
            type: 'Ready',
          },
        ],
      },
    ],
  },
}

const mockClusterClaim: ClusterClaim = {
  apiVersion: ClusterClaimApiVersion,
  kind: ClusterClaimKind,
  metadata: {
    name: 'mycluster-claim',
    namespace: mockClusterPool.metadata.namespace!,
  },
  spec: {
    clusterPoolName: mockClusterPool.metadata.name!,
  },
}

const mockClusterClaimInProgress: ClusterClaim = {
  apiVersion: ClusterClaimApiVersion,
  kind: ClusterClaimKind,
  metadata: {
    name: mockClusterClaim.metadata.name!,
    namespace: mockClusterPool.metadata.namespace!,
  },
  spec: {
    clusterPoolName: mockClusterPool.metadata.name!,
  },
}

const mockClusterClaimFulfilled: ClusterClaim = {
  apiVersion: ClusterClaimApiVersion,
  kind: ClusterClaimKind,
  metadata: {
    name: mockClusterClaim.metadata.name!,
    namespace: mockClusterPool.metadata.namespace!,
  },
  spec: {
    clusterPoolName: mockClusterPool.metadata.name!,
    namespace: `${mockClusterPool.metadata.name!}-XXXXX`,
  },
}

const mockClusterClaimStandbyOnly: ClusterClaim = {
  apiVersion: ClusterClaimApiVersion,
  kind: ClusterClaimKind,
  metadata: {
    name: 'mycluster-standby-claim',
    namespace: mockClusterPoolStandbyOnly.metadata.namespace!,
  },
  spec: {
    clusterPoolName: mockClusterPoolStandbyOnly.metadata.name!,
  },
}

const mockClusterClaimPending: ClusterClaim = {
  apiVersion: ClusterClaimApiVersion,
  kind: ClusterClaimKind,
  metadata: {
    name: 'mycluster-pending-claim',
    namespace: mockClusterPoolPending.metadata.namespace!,
  },
  spec: {
    clusterPoolName: mockClusterPoolPending.metadata.name!,
  },
}

describe('ClusterPools page', () => {
  beforeEach(async () => {
    nockIgnoreRBAC()
    nockIgnoreApiPaths()
    render(
      <RecoilRoot
        initializeState={(snapshot) => {
          snapshot.set(clusterPoolsState, [mockClusterPool, mockClusterPoolPending, mockClusterPoolStandbyOnly])
          snapshot.set(clusterImageSetsState, [mockClusterImageSet])
          snapshot.set(clusterClaimsState, [mockClusterClaim, mockClusterClaimPending, mockClusterClaimStandbyOnly])
        }}
      >
        <MemoryRouter>
          <ClusterPoolsPage />
        </MemoryRouter>
      </RecoilRoot>
    )
  })
  test('shows correct available clusters count', async () => {
    await waitForText(mockClusterPool.metadata.name!)
    await waitForText(mockClusterPoolStandbyOnly.metadata.name!)
    await waitForText('1 out of 2')
    await waitForText('0 out of 2')
    await waitForText('0 out of 1')
  })
  test('should be able to destroy a cluster pool using a row action', async () => {
    await waitForText(mockClusterPool.metadata.name!)
    await clickRowKebabAction(1, 'Destroy cluster pool')
    await typeByText(`Confirm by typing "${mockClusterPool.metadata.name!}" below:`, mockClusterPool.metadata.name!)
    const deleteNocks: Scope[] = [nockDelete(mockClusterPool)]
    await clickByText('Destroy')
    await waitForNocks(deleteNocks)
  })
  test('should be able to destroy cluster pools using bulk actions', async () => {
    await selectTableRow(1)
    await clickBulkAction('Destroy cluster pools')
    await typeByText('Confirm by typing "confirm" below:', 'confirm')
    const deleteNocks: Scope[] = [nockDelete(mockClusterPool)]
    await clickByText('Destroy')
    await waitForNocks(deleteNocks)
  })

  test('should be able to scale a cluster pool size', async () => {
    await waitForText(mockClusterPool.metadata.name!)
    await clickRowKebabAction(1, 'Scale cluster pool')
    await waitForText('Scale cluster pool')
    await clickByLabel('Plus', 0)
    const patchNocks: Scope[] = [
      nockPatch(mockClusterPool, [
        { op: 'replace', path: '/spec/size', value: 3 },
        { op: 'replace', path: '/spec/runningCount', value: 2 },
      ]),
    ]
    await clickByText('Scale')
    await waitForNocks(patchNocks)
  })

  test('should be able to scale a cluster pool running count', async () => {
    await waitForText(mockClusterPool.metadata.name!)
    await clickRowKebabAction(1, 'Scale cluster pool')
    await waitForText('Scale cluster pool')
    await clickByLabel('Minus', 1)
    const patchNocks: Scope[] = [
      nockPatch(mockClusterPool, [
        { op: 'replace', path: '/spec/size', value: 2 },
        { op: 'replace', path: '/spec/runningCount', value: 1 },
      ]),
    ]
    await clickByText('Scale')
    await waitForNocks(patchNocks)
  })

  test('should be able to change the release image for a cluster pool', async () => {
    await waitForText(mockClusterPool.metadata.name!)
    await clickRowKebabAction(1, 'Update release image')
    await waitForText('Update release images')
    await clickByText('Select release image')
    await clickByText(mockClusterImageSet.spec!.releaseImage)
    const patchNocks: Scope[] = [
      nockPatch(mockClusterPool, [
        {
          op: 'replace',
          path: '/spec/imageSetRef/name',
          value: mockClusterImageSet.metadata.name,
        },
      ]),
    ]
    await clickByText('Update')
    await waitForNocks(patchNocks)
  })

  test('should be able to claim a cluster', async () => {
    await waitForText(mockClusterPool.metadata.name!)
    await clickByText('Claim cluster', 0)
    await waitForText('Cluster claim name')
    await typeByTestId('clusterClaimName', mockClusterClaim.metadata.name!)
    const createNocks: Scope[] = [
      nockCreate(mockClusterClaim),
      nockGet(mockClusterClaimInProgress, mockClusterClaimInProgress, 200, false),
      nockGet(mockClusterClaimFulfilled),
    ]
    await clickByText('Claim')
    await waitForNocks(createNocks)
    await waitForText('View cluster')
    await clickByText('Close')
  })

  test('should be able to claim a cluster with only standby clusters', async () => {
    await waitForText(mockClusterPoolStandbyOnly.metadata.name!)
    await clickByText('Claim cluster', 2)
    await waitForText('Cluster claim name')
    await typeByTestId('clusterClaimName', mockClusterClaimStandbyOnly.metadata.name!)
    const createNocks: Scope[] = [nockCreate(mockClusterClaimStandbyOnly)]
    await clickByText('Claim')
    await waitForNocks(createNocks)
    await waitForText('Cluster claim name')
    await waitForText(mockClusterClaimStandbyOnly.metadata.name!, true)
    await clickByText('Close')
  })

  test('should be able to claim a cluster, view pending claim, and delete pending claim', async () => {
    await waitForText(mockClusterPoolPending.metadata.name!)
    await clickByText('Claim cluster', 1)
    await waitForText('Cluster claim name')
    await typeByTestId('clusterClaimName', mockClusterClaimPending.metadata.name!)
    const createNocks: Scope[] = [nockCreate(mockClusterClaimPending)]
    await clickByText('Claim')
    await waitForNocks(createNocks)
    await waitForText('Cluster claim name')
    await waitForText(mockClusterPoolPending.metadata.name!, true)
    await clickByText('Close')
    await clickByText('Delete claim', 1)
    await waitForText('You are about to delete a cluster claim.')
    await typeByTestId('confirm', mockClusterClaimPending.metadata.name!)
    const deleteNocks: Scope[] = [nockDelete(mockClusterClaimPending)]
    await clickByText('Delete')
    await waitForNocks(deleteNocks)
  })
})

describe('Export from clusterpool table', () => {
  test('export button should produce a file for download', async () => {
    nockIgnoreRBAC()
    nockIgnoreApiPaths()
    render(
      <RecoilRoot>
        <MemoryRouter>
          <ClusterPoolsTable clusterPools={[mockClusterPool]} clusters={[mockCluster]} emptyState={''} />
        </MemoryRouter>
      </RecoilRoot>
    )
    window.URL.createObjectURL = jest.fn()
    window.URL.revokeObjectURL = jest.fn()

    const { blobConstructorSpy, createElementSpy } = getCSVExportSpies()

    await clickByLabel('export-search-result')
    await clickByText('Export all to CSV')

    expect(blobConstructorSpy).toHaveBeenCalledWith(
      [
        'Name,Namespace,Cluster status,Available clusters,Infrastructure,Distribution version\n' +
          '"test-pool","test-pool-namespace",-,"1 out of 2","Amazon Web Services","-"',
      ],
      { type: 'text/csv' }
    )
    expect(getCSVDownloadLink(createElementSpy)?.value.download).toMatch(/^clusterpool-[\d]+\.csv$/)
  })
})

describe('Destroy ClusterPool with claimed clusters', () => {
  beforeEach(async () => {
    nockIgnoreRBAC()
    nockIgnoreApiPaths()
    render(
      <RecoilRoot>
        <MemoryRouter>
          <ClusterPoolsTable clusterPools={[mockClusterPool]} clusters={[mockCluster]} emptyState={''} />
        </MemoryRouter>
      </RecoilRoot>
    )
  })

  test('should not be able to destroy a cluster pool using a row action due to related claim size', async () => {
    await waitForText(mockClusterPool.metadata.name!)
    await clickRowKebabAction(1, 'Destroy cluster pool')
    await typeByText(`Confirm by typing "${mockClusterPool.metadata.name!}" below:`, mockClusterPool.metadata.name!)
    expect(
      screen.getByRole('button', {
        name: /destroy/i,
      })
    ).toBeDisabled()
  })

  test('should not be able to destroy cluster pools using bulk actions due to related claim size', async () => {
    await selectTableRow(1)
    await clickBulkAction('Destroy cluster pools')
    await typeByText('Confirm by typing "confirm" below:', 'confirm')
    expect(
      screen.getByRole('button', {
        name: /destroy/i,
      })
    ).toBeDisabled()
  })
})
