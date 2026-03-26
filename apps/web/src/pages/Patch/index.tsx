import { useEffect, useEffectEvent, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import awakenShadowImage from '../../assets/legacy/images/awaken-shadow.png'
import { HttpClientError } from '../../app/http/HttpClientError'
import SelectedNewsPostDetail from './components/SelectedNewsPostDetail'
import {
  getNewsCategories,
  getNewsPostDetail,
  getNewsPosts,
  type NewsCategory,
  type NewsPostDetail,
  type NewsPostListItem,
} from './index.service'
import styles from './index.module.scss'

const newsPostsPageSize = 13

const parsePositiveInteger = (rawValue: string | null) => {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return null
  }

  const numericValue = Number.parseInt(rawValue, 10)

  if (Number.isNaN(numericValue) === true || numericValue <= 0) {
    return null
  }

  return numericValue
}

const buildPatchSearchParams = (categoryId: number | null, postIdValue: string | null) => {
  const nextSearchParams = new URLSearchParams()

  if (typeof categoryId === 'number') {
    nextSearchParams.set('category_id', categoryId.toString())
  }

  if (typeof postIdValue === 'string' && postIdValue.length > 0) {
    nextSearchParams.set('post_id', postIdValue)
  }

  return nextSearchParams
}

type NewsPostsState = {
  hasMoreData: boolean
  isLoading: boolean
  isLoadingMore: boolean
  isUnavailable: boolean
  items: NewsPostListItem[]
  loadMoreErrorMessage: string
  nextCursor: string | null
  resolvedCategoryId: number | null
}

type NewsPostsAction =
  | {
      type: 'load_initial'
    }
  | {
      type: 'load_initial_failure'
      resolvedCategoryId: number
    }
  | {
      items: NewsPostListItem[]
      nextCursor: string | null
      resolvedCategoryId: number
      type: 'load_initial_success'
    }
  | {
      type: 'load_more'
    }
  | {
      type: 'load_more_failure'
    }
  | {
      items: NewsPostListItem[]
      nextCursor: string | null
      type: 'load_more_success'
    }
  | {
      type: 'reset'
    }

type SelectedNewsPostState = {
  frameHeight: number
  hasResolved: boolean
  isLoading: boolean
  isNotFound: boolean
  isUnavailable: boolean
  post: NewsPostDetail | null
}

type SelectedNewsPostAction =
  | {
      type: 'load'
    }
  | {
      type: 'not_found'
    }
  | {
      type: 'reset'
    }
  | {
      frameHeight: number
      type: 'set_frame_height'
    }
  | {
      post: NewsPostDetail
      type: 'success'
    }
  | {
      type: 'unavailable'
    }

const initialNewsPostsState: NewsPostsState = {
  hasMoreData: true,
  isLoading: false,
  isLoadingMore: false,
  isUnavailable: false,
  items: [],
  loadMoreErrorMessage: '',
  nextCursor: null,
  resolvedCategoryId: null,
}

const initialSelectedNewsPostState: SelectedNewsPostState = {
  frameHeight: 320,
  hasResolved: false,
  isLoading: false,
  isNotFound: false,
  isUnavailable: false,
  post: null,
}

const newsPostsReducer = (currentState: NewsPostsState, action: NewsPostsAction): NewsPostsState => {
  switch (action.type) {
    case 'load_initial': {
      return {
        hasMoreData: true,
        isLoading: true,
        isLoadingMore: false,
        isUnavailable: false,
        items: [],
        loadMoreErrorMessage: '',
        nextCursor: null,
        resolvedCategoryId: null,
      }
    }
    case 'load_initial_failure': {
      return {
        ...currentState,
        isLoading: false,
        isUnavailable: true,
        resolvedCategoryId: action.resolvedCategoryId,
      }
    }
    case 'load_initial_success': {
      return {
        ...currentState,
        hasMoreData: action.items.length === newsPostsPageSize,
        isLoading: false,
        items: action.items,
        nextCursor: action.nextCursor,
        resolvedCategoryId: action.resolvedCategoryId,
      }
    }
    case 'load_more': {
      return {
        ...currentState,
        isLoadingMore: true,
        loadMoreErrorMessage: '',
      }
    }
    case 'load_more_failure': {
      return {
        ...currentState,
        isLoadingMore: false,
        loadMoreErrorMessage: 'Unable to load more posts right now.',
      }
    }
    case 'load_more_success': {
      return {
        ...currentState,
        hasMoreData: action.items.length === newsPostsPageSize,
        isLoadingMore: false,
        items: [...currentState.items, ...action.items],
        loadMoreErrorMessage: '',
        nextCursor: action.nextCursor,
      }
    }
    case 'reset': {
      return initialNewsPostsState
    }
    default: {
      return currentState
    }
  }
}

const selectedNewsPostReducer = (
  currentState: SelectedNewsPostState,
  action: SelectedNewsPostAction,
): SelectedNewsPostState => {
  switch (action.type) {
    case 'load': {
      return {
        frameHeight: 320,
        hasResolved: false,
        isLoading: true,
        isNotFound: false,
        isUnavailable: false,
        post: null,
      }
    }
    case 'not_found': {
      return {
        frameHeight: 320,
        hasResolved: true,
        isLoading: false,
        isNotFound: true,
        isUnavailable: false,
        post: null,
      }
    }
    case 'reset': {
      return {
        frameHeight: 320,
        hasResolved: true,
        isLoading: false,
        isNotFound: false,
        isUnavailable: false,
        post: null,
      }
    }
    case 'set_frame_height': {
      return {
        ...currentState,
        frameHeight: action.frameHeight,
      }
    }
    case 'success': {
      return {
        frameHeight: 320,
        hasResolved: true,
        isLoading: false,
        isNotFound: false,
        isUnavailable: false,
        post: action.post,
      }
    }
    case 'unavailable': {
      return {
        frameHeight: 320,
        hasResolved: true,
        isLoading: false,
        isNotFound: false,
        isUnavailable: true,
        post: null,
      }
    }
    default: {
      return currentState
    }
  }
}

const Patch = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [newsCategories, setNewsCategories] = useState<NewsCategory[]>([])
  const [isNewsCategoriesLoading, setIsNewsCategoriesLoading] = useState(true)
  const [isNewsCategoriesUnavailable, setIsNewsCategoriesUnavailable] = useState(false)
  const [newsPostsState, dispatchNewsPostsAction] = useReducer(
    newsPostsReducer,
    initialNewsPostsState,
  )
  const [selectedNewsPostState, dispatchSelectedNewsPostAction] = useReducer(
    selectedNewsPostReducer,
    initialSelectedNewsPostState,
  )
  const bottomProbeElementRef = useRef<HTMLDivElement | null>(null)
  const scrollViewportElementRef = useRef<HTMLDivElement | null>(null)
  const selectedNewsPostFrameRef = useRef<HTMLIFrameElement | null>(null)
  const selectedNewsPostFrameResizeObserverRef = useRef<ResizeObserver | null>(null)
  const activeCategoryIdRef = useRef<number | null>(null)
  const preservedPostsScrollTopRef = useRef<number | null>(null)

  const {
    hasMoreData: hasMoreNewsPostsData,
    isLoading: isNewsPostsLoading,
    isLoadingMore: isLoadingMoreNewsPosts,
    isUnavailable: isNewsPostsUnavailable,
    items: newsPostItems,
    loadMoreErrorMessage: newsPostsLoadMoreErrorMessage,
    nextCursor: nextNewsPostsCursor,
    resolvedCategoryId: resolvedInitialNewsPostsCategoryId,
  } = newsPostsState
  const {
    frameHeight: selectedNewsPostFrameHeight,
    hasResolved: hasResolvedSelectedNewsPost,
    isLoading: isSelectedNewsPostLoading,
    isNotFound: isSelectedNewsPostNotFound,
    isUnavailable: isSelectedNewsPostUnavailable,
    post: selectedNewsPost,
  } = selectedNewsPostState

  const rawCategoryIdValue = searchParams.get('category_id')
  const rawPostIdValue = searchParams.get('post_id')
  const parsedCategoryId = parsePositiveInteger(rawCategoryIdValue)
  const parsedPostId = parsePositiveInteger(rawPostIdValue)
  const currentSearchParamsValue = searchParams.toString()
  const shouldWaitForDetailResolution =
    !!rawPostIdValue === true && parsedPostId !== null && hasResolvedSelectedNewsPost === false
  const matchingRouteCategory = newsCategories.find((newsCategory) => {
    return newsCategory.id === parsedCategoryId
  })
  const resolvedCategoryId =
    isNewsCategoriesLoading === true || shouldWaitForDetailResolution === true
      ? null
      : selectedNewsPost?.categoryId ?? matchingRouteCategory?.id ?? newsCategories[0]?.id ?? null
  const activeCategoryId = resolvedCategoryId
  const normalizedSearchParamsValue = buildPatchSearchParams(
    activeCategoryId,
    rawPostIdValue,
  ).toString()
  const isResolvedPatchRouteReady =
    isNewsCategoriesLoading === false &&
    shouldWaitForDetailResolution === false &&
    resolvedInitialNewsPostsCategoryId === activeCategoryId &&
    (activeCategoryId === null || normalizedSearchParamsValue === currentSearchParamsValue)
  const canShowDetailState =
    isResolvedPatchRouteReady === true &&
    typeof activeCategoryId === 'number' &&
    isNewsCategoriesUnavailable === false
  const isShowingPostsPanel = !!rawPostIdValue === false

  useEffect(() => {
    activeCategoryIdRef.current = activeCategoryId
  }, [activeCategoryId])

  useEffect(() => {
    if (isShowingPostsPanel === false) {
      return
    }

    const preservedPostsScrollTop = preservedPostsScrollTopRef.current
    const scrollViewportElement = scrollViewportElementRef.current

    if (preservedPostsScrollTop === null || !scrollViewportElement) {
      return
    }

    scrollViewportElement.scrollTop = preservedPostsScrollTop
    preservedPostsScrollTopRef.current = null
  }, [isShowingPostsPanel])

  useEffect(() => {
    let isCurrentRequestActive = true

    getNewsCategories()
      .then((responseData) => {
        if (isCurrentRequestActive === false) {
          return
        }

        setNewsCategories(responseData.categories)
      })
      .catch(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsNewsCategoriesUnavailable(true)
      })
      .finally(() => {
        if (isCurrentRequestActive === false) {
          return
        }

        setIsNewsCategoriesLoading(false)
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [])

  useEffect(() => {
    let isCurrentRequestActive = true

    if (!!rawPostIdValue === false) {
      dispatchSelectedNewsPostAction({ type: 'reset' })
      return () => {
        isCurrentRequestActive = false
      }
    }

    if (parsedPostId === null) {
      dispatchSelectedNewsPostAction({ type: 'not_found' })
      return () => {
        isCurrentRequestActive = false
      }
    }

    dispatchSelectedNewsPostAction({ type: 'load' })

    getNewsPostDetail(parsedPostId)
      .then((responseData) => {
        if (isCurrentRequestActive === false) {
          return
        }

        dispatchSelectedNewsPostAction({
          post: responseData.post,
          type: 'success',
        })
      })
      .catch((error) => {
        if (isCurrentRequestActive === false) {
          return
        }

        if (error instanceof HttpClientError && error.status === 404) {
          dispatchSelectedNewsPostAction({ type: 'not_found' })
          return
        }

        dispatchSelectedNewsPostAction({ type: 'unavailable' })
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [parsedPostId, rawPostIdValue])

  useEffect(() => {
    if (isNewsCategoriesLoading === true || shouldWaitForDetailResolution === true) {
      return
    }

    if (normalizedSearchParamsValue !== currentSearchParamsValue) {
      setSearchParams(buildPatchSearchParams(activeCategoryId, rawPostIdValue), { replace: true })
    }
  }, [
    activeCategoryId,
    currentSearchParamsValue,
    normalizedSearchParamsValue,
    isNewsCategoriesLoading,
    rawPostIdValue,
    setSearchParams,
    shouldWaitForDetailResolution,
  ])

  useEffect(() => {
    let isCurrentRequestActive = true

    if (typeof activeCategoryId !== 'number') {
      dispatchNewsPostsAction({ type: 'reset' })
      return () => {
        isCurrentRequestActive = false
      }
    }

    dispatchNewsPostsAction({ type: 'load_initial' })

    getNewsPosts({
      categoryId: activeCategoryId,
      cursor: null,
      pageSize: newsPostsPageSize,
    })
      .then((responseData) => {
        if (isCurrentRequestActive === false || activeCategoryIdRef.current !== activeCategoryId) {
          return
        }

        dispatchNewsPostsAction({
          items: responseData.items,
          nextCursor: responseData.nextCursor,
          resolvedCategoryId: activeCategoryId,
          type: 'load_initial_success',
        })
      })
      .catch(() => {
        if (isCurrentRequestActive === false || activeCategoryIdRef.current !== activeCategoryId) {
          return
        }

        dispatchNewsPostsAction({
          resolvedCategoryId: activeCategoryId,
          type: 'load_initial_failure',
        })
      })

    return () => {
      isCurrentRequestActive = false
    }
  }, [activeCategoryId])

  const handleLoadMoreNewsPosts = async () => {
    if (
      typeof activeCategoryId !== 'number' ||
      !!nextNewsPostsCursor === false ||
      isLoadingMoreNewsPosts === true ||
      isNewsPostsLoading === true ||
      hasMoreNewsPostsData === false
    ) {
      return
    }

    const requestedCategoryId = activeCategoryId

    dispatchNewsPostsAction({ type: 'load_more' })

    return getNewsPosts({
      categoryId: requestedCategoryId,
      cursor: nextNewsPostsCursor,
      pageSize: newsPostsPageSize,
    })
      .then((responseData) => {
        if (activeCategoryIdRef.current !== requestedCategoryId) {
          return
        }

        dispatchNewsPostsAction({
          items: responseData.items,
          nextCursor: responseData.nextCursor,
          type: 'load_more_success',
        })
      })
      .catch(() => {
        if (activeCategoryIdRef.current !== requestedCategoryId) {
          return
        }

        dispatchNewsPostsAction({ type: 'load_more_failure' })
      })
  }

  const handleIntersectBottomProbe = useEffectEvent(() => {
    void handleLoadMoreNewsPosts()
  })

  useEffect(() => {
    const bottomProbeElement = bottomProbeElementRef.current

    if (!!bottomProbeElement === false || typeof IntersectionObserver === 'undefined') {
      return
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
      const bottomProbeEntry = entries[0]

      if (!bottomProbeEntry || bottomProbeEntry.isIntersecting === false) {
        return
      }

      handleIntersectBottomProbe()
    })

    intersectionObserver.observe(bottomProbeElement)

    return () => {
      intersectionObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    return () => {
      selectedNewsPostFrameResizeObserverRef.current?.disconnect()
    }
  }, [])

  const handleMeasureSelectedNewsPostFrame = () => {
    const selectedNewsPostFrameElement = selectedNewsPostFrameRef.current
    const selectedNewsPostFrameDocument = selectedNewsPostFrameElement?.contentDocument
    const selectedNewsPostDocumentElement = selectedNewsPostFrameDocument?.documentElement
    const selectedNewsPostBodyElement = selectedNewsPostFrameDocument?.body

    if (!!selectedNewsPostDocumentElement === false || !!selectedNewsPostBodyElement === false) {
      return
    }

    const nextFrameHeight = Math.max(
      selectedNewsPostDocumentElement.scrollHeight,
      selectedNewsPostBodyElement.scrollHeight,
    )

    if (nextFrameHeight > 0) {
      dispatchSelectedNewsPostAction({
        frameHeight: nextFrameHeight,
        type: 'set_frame_height',
      })
    }
  }

  const handleLoadSelectedNewsPostFrame = () => {
    const selectedNewsPostFrameElement = selectedNewsPostFrameRef.current
    const selectedNewsPostFrameDocument = selectedNewsPostFrameElement?.contentDocument
    const selectedNewsPostDocumentElement = selectedNewsPostFrameDocument?.documentElement

    selectedNewsPostFrameResizeObserverRef.current?.disconnect()
    handleMeasureSelectedNewsPostFrame()

    if (!!selectedNewsPostDocumentElement === false || typeof ResizeObserver === 'undefined') {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      handleMeasureSelectedNewsPostFrame()
    })

    resizeObserver.observe(selectedNewsPostDocumentElement)
    selectedNewsPostFrameResizeObserverRef.current = resizeObserver

    Array.from(selectedNewsPostFrameDocument.querySelectorAll('img')).forEach((imageElement) => {
      imageElement.addEventListener('load', handleMeasureSelectedNewsPostFrame)
    })
  }

  const handleSelectCategory = (nextCategoryId: number) => {
    const nextSearchParams = buildPatchSearchParams(nextCategoryId, null)

    setSearchParams(nextSearchParams)
  }

  const handleSelectNewsPost = (postId: number) => {
    preservedPostsScrollTopRef.current = scrollViewportElementRef.current?.scrollTop ?? null

    const nextSearchParams = buildPatchSearchParams(activeCategoryId, postId.toString())

    setSearchParams(nextSearchParams)
  }

  const handleReturnToNewsPosts = () => {
    const nextSearchParams = buildPatchSearchParams(activeCategoryId, null)

    setSearchParams(nextSearchParams)
  }

  return (
    <section className={styles.root}>
      <div className={styles.container}>
        <div className={styles.panel}>
          <header className={styles.header}>
            <h1>Awaken Patch Notes and Server Updates</h1>
            <p>Awaken News System</p>
          </header>

          <div
            className={styles.scrollViewport}
            data-testid="patch-scroll-viewport"
            ref={scrollViewportElementRef}
          >
            <div className={styles.content}>
              <section className={styles.categoryColumn}>
                {isNewsCategoriesLoading === true && (
                  <p className={styles.statusMessage}>Loading categories...</p>
                )}

                {isNewsCategoriesUnavailable === true && (
                  <p className={styles.statusMessage}>Categories are currently unavailable.</p>
                )}

                {isNewsCategoriesLoading === false &&
                  isNewsCategoriesUnavailable === false &&
                  newsCategories.length === 0 && (
                    <p className={styles.statusMessage}>No categories are available right now.</p>
                  )}

                {newsCategories.length > 0 && (
                  <div className={styles.categoryList}>
                    {newsCategories.map((newsCategory) => {
                      const isCategoryActive = newsCategory.id === activeCategoryId

                      return (
                        <button
                          key={newsCategory.id}
                          className={[
                            styles.categoryButton,
                            isCategoryActive === true ? styles.categoryButtonActive : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => {
                            handleSelectCategory(newsCategory.id)
                          }}
                          type="button"
                        >
                          {newsCategory.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>

              <div className={styles.mainColumn}>
                {isShowingPostsPanel === true && (
                  <>
                    <section className={styles.postsPanel}>
                      {isNewsPostsLoading === true && (
                        <p className={styles.statusMessage}>Loading posts...</p>
                      )}

                      {isNewsPostsUnavailable === true && (
                        <p className={styles.statusMessage}>Posts are currently unavailable.</p>
                      )}

                      {isNewsPostsLoading === false &&
                        isNewsPostsUnavailable === false &&
                        newsPostItems.length === 0 && (
                          <p className={styles.statusMessage}>No posts are available for this category.</p>
                        )}

                      {newsPostItems.length > 0 && (
                        <div className={styles.postList}>
                          {newsPostItems.map((newsPostItem) => {
                            const isPostActive = newsPostItem.id === parsedPostId

                            return (
                              <button
                                key={newsPostItem.id}
                                className={[
                                  styles.postButton,
                                  isPostActive === true ? styles.postButtonActive : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                onClick={() => {
                                  handleSelectNewsPost(newsPostItem.id)
                                }}
                                type="button"
                              >
                                <span>{newsPostItem.title}</span>
                                <time>{newsPostItem.createdAt.slice(0, 10)}</time>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </section>

                    <div
                      aria-hidden="true"
                      className={styles.bottomProbe}
                      ref={bottomProbeElementRef}
                    />

                    {isLoadingMoreNewsPosts === true && (
                      <p className={styles.statusMessage}>Loading more posts...</p>
                    )}

                    {newsPostsLoadMoreErrorMessage.length > 0 && (
                      <div className={styles.loadMoreErrorCard}>
                        <p>{newsPostsLoadMoreErrorMessage}</p>
                        <button
                          className={styles.retryButton}
                          onClick={handleLoadMoreNewsPosts}
                          type="button"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </>
                )}

                {isSelectedNewsPostLoading === true && (
                  <p className={styles.statusMessage}>Loading article...</p>
                )}

                {canShowDetailState === true && isSelectedNewsPostUnavailable === true && (
                  <p className={styles.statusMessage}>The selected article is currently unavailable.</p>
                )}

                {canShowDetailState === true && isSelectedNewsPostNotFound === true && (
                  <p className={styles.statusMessage}>Article not found.</p>
                )}

                {canShowDetailState === true && !!selectedNewsPost === true && (
                  <SelectedNewsPostDetail
                    handleReturnToNewsPosts={handleReturnToNewsPosts}
                    handleLoadSelectedNewsPostFrame={handleLoadSelectedNewsPostFrame}
                    selectedNewsPost={selectedNewsPost}
                    selectedNewsPostFrameHeight={selectedNewsPostFrameHeight}
                    selectedNewsPostFrameRef={selectedNewsPostFrameRef}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <img
        alt=""
        aria-hidden="true"
        className={styles.shadowImage}
        data-testid="patch-shadow-image"
        src={awakenShadowImage}
      />
    </section>
  )
}

export default Patch
