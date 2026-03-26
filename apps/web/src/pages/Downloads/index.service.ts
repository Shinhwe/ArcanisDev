import { HttpClient } from '../../app/http/HttpClient'

type DownloadMirror = {
  id: string
  label: string
  url: string
}

type ClientDownloadsResponse = {
  mirrors: DownloadMirror[]
}

export const getClientDownloads = async (): Promise<ClientDownloadsResponse> => {
  const requestUrl = '/downloads/client'

  return HttpClient.get<ClientDownloadsResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export type {
  ClientDownloadsResponse,
  DownloadMirror,
}
