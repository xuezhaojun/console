/* Copyright Contributors to the Open Cluster Management project */
import { EditorValidationStatus, useData, useEditorValidationStatus, useItem } from '@patternfly-labs/react-form-wizard'
import { PolicySetWizard } from '../../../wizards/Governance/PolicySet/PolicySetWizard'
import { AcmToastContext } from '../../../ui-components'
import { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom-v5-compat'
import { useRecoilValue, useSharedAtoms } from '../../../shared-recoil'
import { SyncEditor, ValidationStatus } from '../../../components/SyncEditor/SyncEditor'
import { useTranslation } from '../../../lib/acm-i18next'
import { NavigationPath } from '../../../NavigationPath'
import { IResource, PolicySetKind } from '../../../resources'
import { reconcileResources } from '../../../resources/utils'
import schema from './schema.json'
import { LostChangesContext } from '../../../components/LostChanges'

export function WizardSyncEditor() {
  const resources = useItem() // Wizard framework sets this context
  const { update } = useData() // Wizard framework sets this context
  const { setEditorValidationStatus } = useEditorValidationStatus()
  const { t } = useTranslation()
  return (
    <SyncEditor
      editorTitle={t('Policy set YAML')}
      variant="toolbar"
      resources={resources}
      schema={schema}
      onEditorChange={(changes: { resources: any[] }): void => {
        update(changes?.resources)
      }}
      onStatusChange={(editorStatus: ValidationStatus): void => {
        setEditorValidationStatus(editorStatus as unknown as EditorValidationStatus)
      }}
      autoCreateNs
    />
  )
}

function getWizardSyncEditor() {
  return <WizardSyncEditor />
}

export function CreatePolicySet() {
  const { t } = useTranslation()
  const toast = useContext(AcmToastContext)
  const navigate = useNavigate()
  const {
    managedClusterSetBindingsState,
    managedClusterSetsState,
    managedClustersState,
    namespacesState,
    placementRulesState,
    placementsState,
    usePolicies,
  } = useSharedAtoms()
  const policies = usePolicies()
  const namespaces = useRecoilValue(namespacesState)
  const placements = useRecoilValue(placementsState)
  const placementRules = useRecoilValue(placementRulesState)
  const managedClusters = useRecoilValue(managedClustersState)
  const clusterSets = useRecoilValue(managedClusterSetsState)
  const clusterSetBindings = useRecoilValue(managedClusterSetBindingsState)
  const namespaceNames = useMemo(
    () => namespaces.map((namespace) => namespace.metadata.name ?? '').sort(),
    [namespaces]
  )
  const { cancelForm, submitForm } = useContext(LostChangesContext)

  return (
    <PolicySetWizard
      title={t('Create policy set')}
      policies={policies}
      clusters={managedClusters}
      placements={placements}
      breadcrumb={[{ text: t('Policy sets'), to: NavigationPath.policySets }, { text: t('Create policy set') }]}
      namespaces={namespaceNames}
      placementRules={placementRules}
      yamlEditor={getWizardSyncEditor}
      clusterSets={clusterSets}
      clusterSetBindings={clusterSetBindings}
      onSubmit={(data) => {
        const resources = data as IResource[]
        return reconcileResources(resources, []).then(() => {
          const policySet = resources.find((resource) => resource.kind === PolicySetKind)
          if (policySet) {
            toast.addAlert({
              title: t('Policy set created'),
              message: t('{{name}} was successfully created.', { name: policySet.metadata?.name }),
              type: 'success',
              autoClose: true,
            })
          }
          submitForm()
          navigate(NavigationPath.policySets)
        })
      }}
      onCancel={() => {
        cancelForm()
        navigate(NavigationPath.policySets)
      }}
    />
  )
}
