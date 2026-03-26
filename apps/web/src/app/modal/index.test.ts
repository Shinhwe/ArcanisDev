import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  fireMock,
} = vi.hoisted(() => {
  return {
    fireMock: vi.fn(),
  }
})

vi.mock('sweetalert2', () => {
  return {
    default: {
      fire: fireMock,
    },
  }
})

import {
  showConfirmModal,
  showErrorModal,
  showSuccessModal,
} from '.'

describe('app modal', () => {
  beforeEach(() => {
    fireMock.mockReset()
  })

  it('shows an error modal through the shared sweetalert2 wrapper', async () => {
    fireMock.mockResolvedValue({
      isConfirmed: true,
    })

    await showErrorModal({
      text: 'Password and confirm password must match.',
      title: 'Unable to register',
    })

    expect(fireMock).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'error',
        text: 'Password and confirm password must match.',
        title: 'Unable to register',
      }),
    )
  })

  it('shows a success modal through the shared sweetalert2 wrapper', async () => {
    fireMock.mockResolvedValue({
      isConfirmed: true,
    })

    await showSuccessModal({
      text: 'Account created successfully.',
      title: 'Success',
    })

    expect(fireMock).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'success',
        text: 'Account created successfully.',
        title: 'Success',
      }),
    )
  })

  it('returns the sweetalert2 result for confirm modals', async () => {
    fireMock.mockResolvedValue({
      isConfirmed: false,
    })

    const modalResult = await showConfirmModal({
      confirmButtonText: 'Continue',
      text: 'Continue with this action?',
      title: 'Confirm action',
    })

    expect(fireMock).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmButtonText: 'Continue',
        icon: 'warning',
        showCancelButton: true,
        text: 'Continue with this action?',
        title: 'Confirm action',
      }),
    )
    expect(modalResult).toEqual({
      isConfirmed: false,
    })
  })
})
