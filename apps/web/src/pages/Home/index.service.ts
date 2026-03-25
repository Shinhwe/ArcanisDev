import { HttpClient } from '../../app/http/HttpClient'

type HomePageConfig = {
  discordLink: string
  youtubeLink: string
}

export const getHomePageConfig = async (): Promise<HomePageConfig> => {
  const requestUrl = '/config'

  return HttpClient.get<HomePageConfig>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export type {
  HomePageConfig,
}
