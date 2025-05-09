/* Copyright Contributors to the Open Cluster Management project */

import { useMemo, useState } from 'react'
import { generatePath, useNavigate } from 'react-router-dom-v5-compat'
import { BulkActionModal, BulkActionModalProps } from '../../../components/BulkActionModal'
import { RbacDropdown } from '../../../components/Rbac'
import { useTranslation } from '../../../lib/acm-i18next'
import { rbacDelete, rbacPatch } from '../../../lib/rbac-util'
import { NavigationPath } from '../../../NavigationPath'
import { Policy, PolicyApiVersion, PolicyDefinition, PolicyKind } from '../../../resources'
import { patchResource } from '../../../resources/utils'
import { AddToPolicySetModal, DeletePolicyModal, PolicyTableItem } from '../policies/Policies'

export function PolicyActionDropdown(props: {
  setModal: (modal: React.ReactNode) => void
  // modal: React.ReactNode
  item: PolicyTableItem
  isKebab: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [modalProps, setModalProps] = useState<BulkActionModalProps<PolicyTableItem> | { open: false }>({
    open: false,
  })
  const { item, setModal } = props
  const policyRemediationAction = item.policy.remediationResult

  const bulkModalStatusColumns = useMemo(
    () => [
      {
        header: t('policy.tableHeader.name'),
        cell: 'policy.metadata.name',
        sort: 'policy.metadata.name',
      },
      {
        header: t('policy.table.actionGroup.status'),
        cell: (item: PolicyTableItem) => (
          <span>
            {item.policy.spec.disabled === true
              ? t('policy.table.actionGroup.status.disabled')
              : t('policy.table.actionGroup.status.enabled')}
          </span>
        ),
      },
    ],
    [t]
  )

  const bulkModalRemediationColumns = useMemo(
    () => [
      {
        header: t('policy.tableHeader.name'),
        cell: 'policy.metadata.name',
        sort: 'policy.metadata.name',
      },
      {
        header: t('policy.table.actionGroup.status'),
        cell: (item: PolicyTableItem) => item.policy.remediationResult,
      },
    ],
    [t]
  )

  const rowActions = useMemo(
    () => [
      {
        id: 'add-to-set',
        text: t('Add to policy set'),
        click: (policy: PolicyTableItem): void => {
          setModal(<AddToPolicySetModal policyTableItems={[policy]} onClose={() => setModal(undefined)} />)
        },
        rbac: [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)],
      },
      {
        id: 'status-policy',
        text: t('policy.table.actionGroup.status'),
        rbac: [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)],
        flyoutMenu: [
          {
            id: 'enable-policy',
            text: t('policy.table.actions.enable'),
            tooltip: item.policy.spec.disabled ? undefined : t('Policy is already enabled'),
            isSelected: !item.policy.spec.disabled,
            isAriaDisabled: item.policy.spec.disabled === false,
            click: (item: PolicyTableItem) => {
              if (item.policy?.spec?.disabled) {
                setModalProps({
                  open: true,
                  title: t('policy.modal.title.enable'),
                  action: t('policy.table.actions.enable'),
                  processing: t('policy.table.actions.enabling'),
                  items: [item],
                  emptyState: undefined, // there is always 1 item supplied
                  description: t('policy.modal.message.enable'),
                  columns: bulkModalStatusColumns,
                  keyFn: (item: PolicyTableItem) => item.policy.metadata.uid as string,
                  actionFn: (item: PolicyTableItem) => {
                    return patchResource(
                      {
                        apiVersion: PolicyApiVersion,
                        kind: PolicyKind,
                        metadata: {
                          name: item.policy.metadata.name,
                          namespace: item.policy.metadata.namespace,
                        },
                      } as Policy,
                      [{ op: 'replace', path: '/spec/disabled', value: false }]
                    )
                  },
                  close: () => {
                    setModalProps({ open: false })
                  },
                  hasExternalResources: item.source !== 'Local',
                })
              }
            },
            rbac: item.policy.spec.disabled ? [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)] : undefined,
          },
          {
            id: 'disable-policy',
            text: t('policy.table.actions.disable'),
            tooltip: item.policy.spec.disabled ? t('Policy is already disabled') : undefined,
            isSelected: item.policy.spec.disabled,
            isAriaDisabled: item.policy.spec.disabled,
            click: (item: PolicyTableItem) => {
              if (!item.policy.spec.disabled) {
                setModalProps({
                  open: true,
                  title: t('policy.modal.title.disable'),
                  action: t('policy.table.actions.disable'),
                  processing: t('policy.table.actions.disabling'),
                  items: [item],
                  emptyState: undefined, // there is always 1 item supplied
                  description: t('policy.modal.message.disable'),
                  columns: bulkModalStatusColumns,
                  keyFn: (item: PolicyTableItem) => item.policy.metadata.uid as string,
                  actionFn: (item) => {
                    return patchResource(
                      {
                        apiVersion: PolicyApiVersion,
                        kind: PolicyKind,
                        metadata: {
                          name: item.policy.metadata.name,
                          namespace: item.policy.metadata.namespace,
                        },
                      } as Policy,
                      [{ op: 'replace', path: '/spec/disabled', value: true }]
                    )
                  },
                  close: () => {
                    setModalProps({ open: false })
                  },
                  hasExternalResources: item.source !== 'Local',
                })
              }
            },
            rbac: item.policy.spec.disabled ? undefined : [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)],
          },
        ],
      },
      {
        id: 'remediation-policy',
        text: t('Remediation'),
        rbac: [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)],
        flyoutMenu: [
          {
            id: 'inform-policy',
            text: t('policy.table.actions.inform'),
            tooltip: policyRemediationAction === 'inform' ? t('Already informing') : undefined,
            isSelected: policyRemediationAction === 'inform',
            isAriaDisabled: policyRemediationAction === 'inform',
            click: (item: PolicyTableItem) => {
              if (policyRemediationAction !== 'inform') {
                setModalProps({
                  open: true,
                  title: t('policy.modal.title.inform'),
                  action: t('policy.table.actions.inform'),
                  processing: t('policy.table.actions.informing'),
                  items: [item],
                  emptyState: undefined, // there is always 1 item supplied
                  description: t('policy.modal.message.inform'),
                  columns: bulkModalRemediationColumns,
                  keyFn: (item: PolicyTableItem) => item.policy.metadata.uid as string,
                  actionFn: (item: PolicyTableItem) => {
                    return patchResource(
                      {
                        apiVersion: PolicyApiVersion,
                        kind: PolicyKind,
                        metadata: {
                          name: item.policy.metadata.name,
                          namespace: item.policy.metadata.namespace,
                        },
                      } as Policy,
                      [{ op: 'replace', path: '/spec/remediationAction', value: 'inform' }]
                    )
                  },
                  close: () => {
                    setModalProps({ open: false })
                  },
                  hasExternalResources: item.source !== 'Local',
                })
              }
            },
            rbac:
              policyRemediationAction === 'inform'
                ? undefined
                : [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)],
          },
          {
            id: 'enforce-policy',
            text: t('policy.table.actions.enforce'),
            tooltip: policyRemediationAction === 'enforce' ? t('Already enforcing') : undefined,
            isSelected: policyRemediationAction === 'enforce',
            isAriaDisabled: policyRemediationAction === 'enforce',
            click: (item: PolicyTableItem) => {
              if (policyRemediationAction !== 'enforce') {
                setModalProps({
                  open: true,
                  title: t('policy.modal.title.enforce'),
                  action: t('policy.table.actions.enforce'),
                  processing: t('policy.table.actions.enforcing'),
                  items: [item],
                  emptyState: undefined, // there is always 1 item supplied
                  description: t('policy.modal.message.enforce'),
                  columns: bulkModalRemediationColumns,
                  keyFn: (item: PolicyTableItem) => item.policy.metadata.uid as string,
                  actionFn: (item: PolicyTableItem) => {
                    return patchResource(
                      {
                        apiVersion: PolicyApiVersion,
                        kind: PolicyKind,
                        metadata: {
                          name: item.policy.metadata.name,
                          namespace: item.policy.metadata.namespace,
                        },
                      } as Policy,
                      [{ op: 'replace', path: '/spec/remediationAction', value: 'enforce' }]
                    )
                  },
                  close: () => {
                    setModalProps({ open: false })
                  },
                  hasExternalResources: item.source !== 'Local',
                })
              }
            },
            rbac:
              policyRemediationAction === 'enforce'
                ? undefined
                : [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)],
          },
        ],
      },
      {
        id: 'edit-policy',
        text: t('Edit'),
        addSeparator: true,
        click: (item: PolicyTableItem) => {
          let path = generatePath(NavigationPath.editPolicy, {
            namespace: item.policy.metadata.namespace!,
            name: item.policy.metadata.name!,
          })
          if (props.isKebab) {
            path += '?context=policies'
          }
          navigate(path)
        },
        rbac: [rbacPatch(PolicyDefinition, item.policy.metadata.namespace)],
      },
      {
        id: 'delete-policy',
        text: t('Delete'),
        addSeparator: true,
        click: (policy: PolicyTableItem) => {
          setModal(<DeletePolicyModal item={policy} onClose={() => setModal(undefined)} />)
        },
        rbac: [rbacDelete(PolicyDefinition, item.policy.metadata.namespace, item.policy.metadata.name)],
      },
    ],
    [
      item,
      bulkModalRemediationColumns,
      bulkModalStatusColumns,
      navigate,
      policyRemediationAction,
      props.isKebab,
      setModal,
      t,
    ]
  )

  return (
    <>
      <BulkActionModal<PolicyTableItem> {...modalProps} />
      {rowActions && rowActions.length > 0 && (
        <RbacDropdown<PolicyTableItem>
          id={`${item.policy.metadata.name}-actions`}
          item={item}
          isKebab={props.isKebab}
          text={t('actions')}
          actions={rowActions}
        />
      )}
    </>
  )
}
