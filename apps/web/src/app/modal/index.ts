import Swal, {
  type SweetAlertOptions,
  type SweetAlertResult,
} from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import './index.scss'

type SharedModalOptions = {
  confirmButtonText?: string
  text: string
  title: string
}

type ConfirmModalOptions = SharedModalOptions & {
  cancelButtonText?: string
}

const createBaseModalOptions = (): SweetAlertOptions => {
  return {
    allowOutsideClick: true,
    background: '#f8f8f8',
    buttonsStyling: false,
    color: '#1b1b21',
    confirmButtonColor: '#2d819f',
    customClass: {
      cancelButton: 'arcanisSwalCancelButton',
      confirmButton: 'arcanisSwalConfirmButton',
      container: 'arcanisSwalContainer',
      htmlContainer: 'arcanisSwalContent',
      popup: 'arcanisSwalPopup',
      title: 'arcanisSwalTitle',
    },
    reverseButtons: true,
  }
}

export const showErrorModal = async (
  sharedModalOptions: SharedModalOptions,
): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...createBaseModalOptions(),
    confirmButtonText: sharedModalOptions.confirmButtonText ?? 'OK',
    icon: 'error',
    text: sharedModalOptions.text,
    title: sharedModalOptions.title,
  })
}

export const showSuccessModal = async (
  sharedModalOptions: SharedModalOptions,
): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...createBaseModalOptions(),
    confirmButtonText: sharedModalOptions.confirmButtonText ?? 'OK',
    icon: 'success',
    text: sharedModalOptions.text,
    title: sharedModalOptions.title,
  })
}

export const showConfirmModal = async (
  confirmModalOptions: ConfirmModalOptions,
): Promise<SweetAlertResult> => {
  return Swal.fire({
    ...createBaseModalOptions(),
    cancelButtonText: confirmModalOptions.cancelButtonText ?? 'Cancel',
    confirmButtonText: confirmModalOptions.confirmButtonText ?? 'Confirm',
    icon: 'warning',
    showCancelButton: true,
    text: confirmModalOptions.text,
    title: confirmModalOptions.title,
  })
}
