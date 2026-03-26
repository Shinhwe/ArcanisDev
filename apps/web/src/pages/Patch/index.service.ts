import { HttpClient } from '../../app/http/HttpClient'

type NewsCategory = {
  id: number
  name: string
}

type NewsCategoryListResponse = {
  categories: NewsCategory[]
}

type NewsPostListItem = {
  id: number
  categoryId: number
  title: string
  createdAt: string
}

type NewsPostListResponse = {
  items: NewsPostListItem[]
  nextCursor: string | null
}

type GetNewsPostsRequest = {
  categoryId: number
  cursor?: string | null
  pageSize: number
}

type NewsPostDetail = {
  id: number
  categoryId: number
  categoryName: string
  title: string
  createdAt: string
  iframeHtmlDocument: string
}

type NewsPostDetailResponse = {
  post: NewsPostDetail
}

export const getNewsCategories = async (): Promise<NewsCategoryListResponse> => {
  const requestUrl = '/news/categories'

  return HttpClient.get<NewsCategoryListResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export const getNewsPostDetail = async (postId: number): Promise<NewsPostDetailResponse> => {
  const requestUrl = `/news/posts/${postId}`

  return HttpClient.get<NewsPostDetailResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export const getNewsPosts = async (
  getNewsPostsRequest: GetNewsPostsRequest,
): Promise<NewsPostListResponse> => {
  const searchParams = new URLSearchParams({
    categoryId: getNewsPostsRequest.categoryId.toString(),
    pageSize: getNewsPostsRequest.pageSize.toString(),
  })

  if (!!getNewsPostsRequest.cursor === true) {
    searchParams.set('cursor', getNewsPostsRequest.cursor!)
  }

  const requestUrl = `/news/posts?${searchParams.toString()}`

  return HttpClient.get<NewsPostListResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export type {
  GetNewsPostsRequest,
  NewsCategory,
  NewsCategoryListResponse,
  NewsPostDetail,
  NewsPostDetailResponse,
  NewsPostListItem,
  NewsPostListResponse,
}
