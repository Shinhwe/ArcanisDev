import { HttpClientError, type HttpMethod } from '../HttpClientError'

type HttpClientRequestOptions = Omit<RequestInit, 'body' | 'headers' | 'method'> & {
  headers?: HeadersInit
}

const isAbsoluteUrl = (url: string) => {
  return /^https?:\/\//i.test(url)
}

const API_PREFIX = '/api/v1'

const buildRequestUrl = (url: string) => {
  if (isAbsoluteUrl(url)) {
    return url
  }

  if (url === API_PREFIX || url.startsWith(`${API_PREFIX}/`)) {
    return url
  }

  const normalizedUrl = url.startsWith('/') ? url.slice(1) : url

  return `${API_PREFIX}/${normalizedUrl}`
}

const createRequestHeaders = (headers?: HeadersInit, body?: unknown) => {
  const requestHeaders = new Headers()
  const token = localStorage.getItem('token')

  requestHeaders.set('Accept', 'application/json')

  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (!!token === true) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const customHeaders = new Headers(headers)

  customHeaders.forEach((value, key) => {
    requestHeaders.set(key, value)
  })

  return requestHeaders
}

const parseResponseBody = async (response: Response) => {
  return response.text().then((responseText) => {
    const contentType = response.headers.get('Content-Type') ?? ''

    if (responseText.length === 0) {
      return undefined
    }

    if (contentType.toLowerCase().includes('json')) {
      try {
        return JSON.parse(responseText)
      } catch {
        return responseText
      }
    }

    return responseText
  })
}

const request = async <T>(
  method: HttpMethod,
  url: string,
  options: HttpClientRequestOptions = {},
  body?: unknown,
): Promise<T> => {
  const requestUrl = buildRequestUrl(url)
  const requestHeaders = createRequestHeaders(options.headers, body)

  return fetch(requestUrl, {
    ...options,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: requestHeaders,
    method,
  }).then((response) => {
    return parseResponseBody(response).then((data) => {
      if (response.ok) {
        return data as T
      }

      return Promise.reject(
        new HttpClientError({
          data,
          method,
          status: response.status,
          statusText: response.statusText,
          url: requestUrl,
        }),
      )
    })
  })
}

export const HttpClient = {
  del: async <T>(url: string, options?: HttpClientRequestOptions): Promise<T> => {
    return request<T>('DELETE', url, options)
  },
  get: async <T>(url: string, options?: HttpClientRequestOptions): Promise<T> => {
    return request<T>('GET', url, options)
  },
  post: async <T>(url: string, body?: unknown, options?: HttpClientRequestOptions): Promise<T> => {
    return request<T>('POST', url, options, body)
  },
  put: async <T>(url: string, body?: unknown, options?: HttpClientRequestOptions): Promise<T> => {
    return request<T>('PUT', url, options, body)
  },
}
