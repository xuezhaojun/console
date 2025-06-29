/* Copyright Contributors to the Open Cluster Management project */

import { act, ByRoleMatcher, ByRoleOptions, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Scope } from 'nock/types'

export const waitTimeout = 5 * 1000

const waitForOptions = { timeout: waitTimeout }

// By Text

export async function waitForText(text: string, multipleAllowed?: boolean) {
  if (multipleAllowed) {
    await waitFor(() => expect(screen.queryAllByText(text).length).toBeGreaterThan(0), waitForOptions)
  } else {
    await waitFor(() => expect(screen.getByText(text)).toBeDefined(), waitForOptions)
  }
}

export async function waitForNotText(text: string) {
  await waitFor(() => expect(screen.queryAllByText(text)).toHaveLength(0), waitForOptions)
}

export async function waitForInputByText(text: string, index?: number) {
  if (index !== undefined) {
    await waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(index), waitForOptions)
    await waitFor(() => expect(screen.getAllByText(text)[index]).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () =>
        expect((screen.getAllByText(text)[index] as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual(
          'true'
        ),
      waitForOptions
    )
  } else {
    await waitFor(() => expect(screen.getByText(text)).toBeDefined(), waitForOptions)
    await waitFor(() => expect(screen.getByText(text)).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () => expect((screen.getByText(text) as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual('true'),
      waitForOptions
    )
  }
}

export async function waitForInputByTitle(title: string, index?: number) {
  if (index !== undefined) {
    await waitFor(() => expect(screen.getAllByTitle(title).length).toBeGreaterThan(index), waitForOptions)
    await waitFor(() => expect(screen.getAllByTitle(title)[index]).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () =>
        expect((screen.getAllByTitle(title)[index] as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual(
          'true'
        ),
      waitForOptions
    )
  } else {
    await waitFor(() => expect(screen.getByTitle(title)).toBeDefined(), waitForOptions)
    await waitFor(() => expect(screen.getByTitle(title)).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () => expect((screen.getByTitle(title) as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual('true'),
      waitForOptions
    )
  }
}

export async function clickByText(text: string, index?: number) {
  await waitForInputByText(text, index)
  if (index !== undefined) {
    // wait for rbac to enable the button associated with this text
    await waitFor(
      () =>
        expect(
          (screen.getAllByText(text)[index].closest('button') as HTMLInputElement)?.getAttribute('aria-disabled')
        ).not.toEqual('true'),
      waitForOptions
    )
    userEvent.click(screen.getAllByText(text)[index])
  } else {
    // wait for rbac to enable the button associated with this text
    await waitFor(
      () =>
        expect(
          (screen.getByText(text).closest('button') as HTMLInputElement)?.getAttribute('aria-disabled')
        ).not.toEqual('true'),
      waitForOptions
    )
    userEvent.click(screen.getByText(text))
  }
}

export async function clickByTitle(title: string, index?: number) {
  await waitForInputByTitle(title, index)
  if (index !== undefined) {
    userEvent.click(screen.getAllByTitle(title)[index])
  } else {
    userEvent.click(screen.getByTitle(title))
  }
}

export async function typeByText(text: string, type: string, index?: number) {
  await waitForInputByText(text, index)
  if (index !== undefined) {
    userEvent.type(screen.getAllByText(text)[index], type)
  } else {
    userEvent.type(screen.getByText(text), type)
  }
}

// By Placeholder text

export async function typeByPlaceholderText(text: string, type: string, index?: number) {
  if (index !== undefined) {
    userEvent.type(screen.getAllByPlaceholderText(text)[index], type)
  } else {
    userEvent.type(screen.getByPlaceholderText(text), type)
  }
}

export async function clickByPlaceholderText(text: string, index?: number) {
  if (index !== undefined) {
    userEvent.click(screen.getAllByPlaceholderText(text)[index])
  } else {
    userEvent.click(screen.getByPlaceholderText(text))
  }
}

// By Role

export async function waitForRole(role: ByRoleMatcher, options?: ByRoleOptions, multipleAllowed?: boolean) {
  if (multipleAllowed) {
    await waitFor(() => expect(screen.queryAllByRole(role, options).length).toBeGreaterThan(0), waitForOptions)
  } else {
    await waitFor(() => expect(screen.getByRole(role, options)).toBeDefined(), waitForOptions)
  }
}

export async function waitForNotRole(role: ByRoleMatcher, options?: ByRoleOptions) {
  await waitFor(() => expect(screen.queryAllByRole(role, options)).toHaveLength(0), waitForOptions)
}

export async function waitForInputByRole(role: ByRoleMatcher, options?: ByRoleOptions, index?: number) {
  if (index !== undefined) {
    await waitFor(() => expect(screen.getAllByRole(role, options).length).toBeGreaterThan(index), waitForOptions)
    await waitFor(() => expect(screen.getAllByRole(role, options)[index]).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () =>
        expect(
          (screen.getAllByRole(role, options)[index] as HTMLInputElement).getAttribute('aria-disabled')
        ).not.toEqual('true'),
      waitForOptions
    )
  } else {
    await waitFor(() => expect(screen.getByRole(role, options)).toBeDefined(), waitForOptions)
    await waitFor(() => expect(screen.getByRole(role, options)).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () =>
        expect((screen.getByRole(role, options) as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual('true'),
      waitForOptions
    )
  }
}

export async function clickByRole(role: ByRoleMatcher, options?: ByRoleOptions, index?: number) {
  await waitForInputByRole(role, options, index)
  if (index !== undefined) {
    userEvent.click(screen.getAllByRole(role, options)[index])
  } else {
    userEvent.click(screen.getByRole(role, options))
  }
}

export async function typeByRole(type: string, role: ByRoleMatcher, options?: ByRoleOptions, index?: number) {
  await waitForInputByRole(role, options, index)
  if (index !== undefined) {
    userEvent.type(screen.getAllByRole(role, options)[index], type)
  } else {
    userEvent.type(screen.getByRole(role, options), type)
  }
}

// By TestId

export async function waitForTestId(text: string, multipleAllowed?: boolean) {
  if (multipleAllowed) {
    await waitFor(() => expect(screen.queryAllByTestId(text).length).toBeGreaterThan(0), waitForOptions)
  } else {
    await waitFor(() => expect(screen.getByTestId(text)).toBeDefined(), waitForOptions)
  }
}

export async function waitForNotTestId(text: string) {
  await waitFor(() => expect(screen.queryAllByTestId(text)).toHaveLength(0), waitForOptions)
}

export async function waitForInputByTestId(text: string, index?: number) {
  if (index !== undefined) {
    await waitFor(() => expect(screen.getAllByTestId(text).length).toBeGreaterThan(index), waitForOptions)
    await waitFor(() => expect(screen.getAllByTestId(text)[index]).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () =>
        expect((screen.getAllByTestId(text)[index] as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual(
          'true'
        ),
      waitForOptions
    )
  } else {
    await waitFor(() => expect(screen.getByTestId(text)).toBeDefined(), waitForOptions)
    await waitFor(() => expect(screen.getByTestId(text)).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () => expect((screen.getByTestId(text) as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual('true'),
      waitForOptions
    )
  }
}

export async function clickByTestId(text: string, index?: number) {
  await waitForInputByTestId(text, index)
  if (index !== undefined) {
    userEvent.click(screen.getAllByTestId(text)[index])
  } else {
    userEvent.click(screen.getByTestId(text))
  }
}

export async function typeByTestId(id: string, type: string, index?: number) {
  await waitForInputByTestId(id, index)
  if (index !== undefined) {
    userEvent.type(screen.getAllByTestId(id)[index], type)
  } else {
    userEvent.type(screen.getByTestId(id), type)
  }
}

export async function pasteByTestId(id: string, type: string, index?: number) {
  await waitForInputByTestId(id, index)
  if (index !== undefined) {
    userEvent.paste(screen.getAllByTestId(id)[index], type)
  } else {
    userEvent.paste(screen.getByTestId(id), type)
  }
}

export async function clearByTestId(id: string, index?: number) {
  await waitForInputByTestId(id, index)
  if (index !== undefined) {
    userEvent.clear(screen.getAllByTestId(id)[index])
  } else {
    userEvent.clear(screen.getByTestId(id))
  }
}

// By Label Text

export async function waitForLabelText(text: string, multipleAllowed?: boolean) {
  if (multipleAllowed) {
    await waitFor(() => expect(screen.queryAllByLabelText(text).length).toBeGreaterThan(0), waitForOptions)
  } else {
    await waitFor(() => expect(screen.getByLabelText(text)).toBeDefined(), waitForOptions)
  }
}

export async function waitForNotLabelText(text: string) {
  await waitFor(() => expect(screen.queryAllByLabelText(text)).toHaveLength(0), waitForOptions)
}

export async function waitForInputByLabelText(text: string, index?: number) {
  if (index !== undefined) {
    await waitFor(() => expect(screen.getAllByLabelText(text).length).toBeGreaterThan(index), waitForOptions)
    await waitFor(() => expect(screen.getAllByLabelText(text)[index]).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () =>
        expect((screen.getAllByLabelText(text)[index] as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual(
          'true'
        ),
      waitForOptions
    )
  } else {
    await waitFor(() => expect(screen.getByLabelText(text)).toBeDefined(), waitForOptions)
    await waitFor(() => expect(screen.getByLabelText(text)).not.toBeDisabled(), waitForOptions)
    await waitFor(
      () => expect((screen.getByLabelText(text) as HTMLInputElement).getAttribute('aria-disabled')).not.toEqual('true'),
      waitForOptions
    )
  }
}

export async function clickByLabel(text: string, index?: number) {
  await waitForInputByLabelText(text, index)
  if (index !== undefined) {
    userEvent.click(screen.getAllByLabelText(text)[index])
  } else {
    userEvent.click(screen.getByLabelText(text))
  }
}

export async function typeByLabel(text: string, type: string, index?: number) {
  await waitForInputByLabelText(text, index)
  if (index !== undefined) {
    userEvent.type(screen.getAllByLabelText(text)[index], type)
  } else {
    userEvent.type(screen.getByLabelText(text), type)
  }
}

// By Selector
export async function waitForSelector(container: HTMLElement, selector: string) {
  await waitFor(() => expect(container.querySelector(selector)).toBeDefined())
}

export async function waitForNoSelector(container: HTMLElement, selector: string) {
  await waitFor(() => expect(container.querySelector(selector)).toHaveLength(0), waitForOptions)
}

export async function waitForValueBySelector(container: HTMLElement, selector: string, value: string | number) {
  await waitFor(() => expect(container.querySelector(selector)).toHaveValue(value))
}

export async function clickBySelector(container: HTMLElement, selector: string) {
  const elem = await waitFor(() => container.querySelector<HTMLButtonElement>(selector))
  elem?.click()
}

// Other

export async function wait(ms = 0) {
  await act(() => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  })
}

export async function waitForCalled(jestMock: jest.Mock) {
  await waitFor(() => expect(jestMock).toHaveBeenCalled(), waitForOptions)
}

// Nocks

export function nocksAreDone(nocks: Scope[]) {
  for (const nock of nocks) {
    if (!nock.isDone()) return false
  }
  return true
}

export async function waitForNocks(nocks: Scope[]) {
  const timeout = waitForOptions.timeout * nocks.length * 3
  const timeoutMsg = (error: Error) => {
    error.message = `!!!!!!!!!!! Test timed out in waitForNocks()--waited ${timeout / 1000} seconds !!!!!!!!!!!!!`
    error.stack = ''
    return error
  }
  await waitFor(() => expect(nocksAreDone(nocks)).toBeTruthy(), { timeout, onTimeout: timeoutMsg })
}

export async function waitForNock(nock: Scope) {
  await waitFor(() => expect(nock.isDone()).toBeTruthy(), waitForOptions)
}

export async function selectAllRows() {
  await clickByRole('checkbox', {}, 0)
}

export async function selectTableRow(row: number) {
  await clickByLabel(`Select row ${row - 1}`)
}

export async function clickBulkAction(text: string) {
  await clickByText('Actions')
  await clickByText(text)
}

export async function clickRowActionButton(row: number, table = 'Simple Table') {
  await waitForRole('grid', { name: table })
  const grid = screen.getByRole('grid', { name: table })
  const actionButtons = within(grid).getAllByRole('button', { name: 'Actions' })

  // click the action button for the specified row (row is 1-based, so we subtract 1)
  actionButtons[row - 1].click()
}

export async function selectByText(placeholdText: string, text: string) {
  await clickByPlaceholderText(placeholdText)
  await clickByText(text)
}

export async function clickHostAction(text: string) {
  await clickByText('ai:Add hosts')
  await clickByText(text)
}

export function isCardEnabled(card: HTMLElement) {
  return card.style.cursor === 'pointer'
}

export const getCSVExportSpies = () => {
  const blobConstructorSpy = jest.fn()
  jest.spyOn(global, 'Blob').mockImplementationOnce(blobConstructorSpy)
  const createElementSpy = jest.spyOn(document, 'createElement')
  return { blobConstructorSpy, createElementSpy }
}

export const getCSVDownloadLink = (createElementSpy: jest.SpyInstance<HTMLElement>) =>
  createElementSpy.mock.results.find(
    ({ type, value }, index) =>
      createElementSpy.mock.calls[index][0] === 'a' && type === 'return' && value.getAttribute('download')
  )

export const templateMaker = function (obj: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (context: { [x: string]: any }) {
    const replacer = function (_key: string, val: () => string | number) {
      if (typeof val === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return context[val()]
      }
      return val
    }
    return JSON.parse(JSON.stringify(obj, replacer)) as unknown
  }
}

export const getMultipleMocks = (obj: unknown, repeat: number) => {
  const template = templateMaker(obj)
  return Array.from(Array(repeat).keys()).map((inx) => {
    return template({ name: `cluster${inx + 1}` })
  })
}

/**
 * Clicks a kebab menu action for a table row (PF5 compatible)
 * @param row Row number (1-based)
 * @param actionText Text of the menu item to click
 * @param table Optional table name, defaults to 'Simple Table'
 */
export async function clickRowKebabAction(row: number, actionText: string, table = 'Simple Table') {
  //  get table
  await waitForRole('grid', { name: table })
  const grid = screen.getByRole('grid', { name: table })

  // get all the rows including header
  const rows = within(grid).getAllByRole('row')

  // target row (accounting for header row)
  const targetRow = rows[row]

  // finds the kebab button in the row
  const kebabButton = within(targetRow).getByRole('button', { name: 'Actions' })

  // click to open the menu
  userEvent.click(kebabButton)

  // wait for the menu to appear, then find the action item by text and click it
  await clickByRole('menuitem', { name: actionText })
}

/**
 * Clicks a dropdown action - works for both table row kebabs and standalone dropdowns
 */
export async function clickDropdownAction(actionText: string, buttonLabel = 'Actions') {
  // Find and click the actions button
  const actionsButton = screen.getByRole('button', { name: buttonLabel })
  userEvent.click(actionsButton)

  // Wait for and click the menu item
  await waitFor(() => screen.getByText(actionText))
  await clickByText(actionText)
}
