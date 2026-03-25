type HttpMethod = 'DELETE' | 'GET' | 'POST' | 'PUT'

type HttpClientErrorOptions = {
  data: unknown
  method: HttpMethod
  status: number
  statusText: string
  url: string
}

const getErrorMessage = ({ data, method, status, url }: HttpClientErrorOptions) => {
  if (typeof data === 'string' && data.trim().length > 0) {
    return data
  }

  if (typeof data === 'object' && data !== null) {
    const errorData = data as {
      detail?: unknown
      message?: unknown
      title?: unknown
    }

    if (typeof errorData.message === 'string' && errorData.message.trim().length > 0) {
      return errorData.message
    }

    if (typeof errorData.title === 'string' && errorData.title.trim().length > 0) {
      return errorData.title
    }

    if (typeof errorData.detail === 'string' && errorData.detail.trim().length > 0) {
      return errorData.detail
    }
  }

  return `${method} ${url} failed with status ${status}`
}

export class HttpClientError extends Error {
  data: unknown
  method: HttpMethod
  status: number
  statusText: string
  url: string

  constructor(options: HttpClientErrorOptions) {
    super(getErrorMessage(options))

    this.name = 'HttpClientError'
    this.data = options.data
    this.method = options.method
    this.status = options.status
    this.statusText = options.statusText
    this.url = options.url
  }
}

export type { HttpClientErrorOptions, HttpMethod }
