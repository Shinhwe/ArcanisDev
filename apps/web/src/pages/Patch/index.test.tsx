import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpClientError } from '../../app/http/HttpClientError'
import Patch from '.'

const {
  getNewsCategoriesMock,
  getNewsPostDetailMock,
  getNewsPostsMock,
} = vi.hoisted(() => {
  return {
    getNewsCategoriesMock: vi.fn(),
    getNewsPostDetailMock: vi.fn(),
    getNewsPostsMock: vi.fn(),
  }
})

vi.mock('./index.service', () => {
  return {
    getNewsCategories: getNewsCategoriesMock,
    getNewsPostDetail: getNewsPostDetailMock,
    getNewsPosts: getNewsPostsMock,
  }
})

type MockIntersectionObserverRecord = {
  callback: IntersectionObserverCallback
  observedElements: Element[]
}

const intersectionObserverRecords: MockIntersectionObserverRecord[] = []

class MockIntersectionObserver {
  readonly callback: IntersectionObserverCallback
  readonly observedElements: Element[]

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    this.observedElements = []

    intersectionObserverRecords.push({
      callback,
      observedElements: this.observedElements,
    })
  }

  disconnect() {}

  observe(element: Element) {
    this.observedElements.push(element)
  }

  unobserve() {}
}

class MockResizeObserver {
  disconnect() {}

  observe() {}

  unobserve() {}
}

const defaultCategoriesResponse = {
  categories: [
    {
      id: 1,
      name: 'Announcements',
    },
    {
      id: 3,
      name: 'Patch Notes',
    },
  ],
}

const createPostListResponse = (postCount: number, nextCursor: string | null) => {
  return {
    items: Array.from({ length: postCount }, (_, postIndex) => {
      const postId = postIndex + 1

      return {
        id: postId,
        categoryId: 3,
        title: `Patch Post ${postId}`,
        createdAt: `2024-11-17T17:38:${postId.toString().padStart(2, '0')}.0000000Z`,
      }
    }),
    nextCursor,
  }
}

const LocationProbe = () => {
  const location = useLocation()

  return <output data-testid="location-search">{location.search}</output>
}

const renderPatchPage = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Patch />
      <LocationProbe />
    </MemoryRouter>,
  )
}

const triggerBottomProbeIntersection = async () => {
  const observerRecord = intersectionObserverRecords[0]
  const observedElement = observerRecord?.observedElements[0]

  if (!observerRecord || !observedElement) {
    throw new Error('No IntersectionObserver target was registered.')
  }

  await act(async () => {
    observerRecord.callback(
      [
        {
          boundingClientRect: observedElement.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: observedElement.getBoundingClientRect(),
          isIntersecting: true,
          rootBounds: null,
          target: observedElement,
          time: Date.now(),
        },
      ] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    )
  })
}

describe('Patch page', () => {
  beforeEach(() => {
    getNewsCategoriesMock.mockReset()
    getNewsPostDetailMock.mockReset()
    getNewsPostsMock.mockReset()
    intersectionObserverRecords.splice(0, intersectionObserverRecords.length)
    vi.stubGlobal(
      'IntersectionObserver',
      MockIntersectionObserver as unknown as typeof IntersectionObserver,
    )
    vi.stubGlobal('ResizeObserver', MockResizeObserver as typeof ResizeObserver)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('normalizes a missing category_id to the first category and keeps the detail component hidden before selection', async () => {
    getNewsCategoriesMock.mockResolvedValue(defaultCategoriesResponse)
    getNewsPostsMock.mockResolvedValue(createPostListResponse(2, null))

    renderPatchPage('/patch')

    expect(await screen.findByText('Patch Post 1')).toBeInTheDocument()
    expect(screen.getByTestId('patch-scroll-viewport')).toBeInTheDocument()
    expect(screen.getByTestId('patch-shadow-image')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent('?category_id=1')
    expect(screen.queryByRole('heading', { name: 'Categories' })).not.toBeInTheDocument()
    expect(
      screen.queryByText(/browse the published announcements, updates, and patch notes from the legacy cms\./i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/choose an article to preview/i)).not.toBeInTheDocument()
    expect(getNewsPostsMock).toHaveBeenCalledWith({
      categoryId: 1,
      cursor: null,
      pageSize: 13,
    })
  })

  it('loads detail first when post_id is present and normalizes category_id from the detail payload', async () => {
    getNewsCategoriesMock.mockResolvedValue(defaultCategoriesResponse)
    getNewsPostDetailMock.mockResolvedValue({
      post: {
        id: 6,
        categoryId: 3,
        categoryName: 'Patch Notes',
        title: 'Patch v1.6 Preview',
        createdAt: '2024-11-17T17:38:37.0000000Z',
        iframeHtmlDocument: '<!doctype html><html><body><p>Preview</p></body></html>',
      },
    })
    getNewsPostsMock.mockResolvedValue(createPostListResponse(2, null))

    renderPatchPage('/patch?category_id=1&post_id=6')

    expect(await screen.findByRole('heading', { name: /patch v1.6 preview/i })).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent('?category_id=3&post_id=6')
    expect(screen.queryByRole('heading', { name: 'Posts' })).not.toBeInTheDocument()
    expect(screen.queryByText('Patch Post 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Selected Article')).not.toBeInTheDocument()
    expect(screen.getByTitle(/selected article content/i)).toHaveAttribute(
      'srcdoc',
      expect.stringContaining('<p>Preview</p>'),
    )
    expect(getNewsPostsMock).toHaveBeenCalledWith({
      categoryId: 3,
      cursor: null,
      pageSize: 13,
    })
  })

  it('returns to the list and restores the previous scroll position after clicking the back button', async () => {
    getNewsCategoriesMock.mockResolvedValue(defaultCategoriesResponse)
    getNewsPostDetailMock.mockResolvedValue({
      post: {
        id: 2,
        categoryId: 3,
        categoryName: 'Patch Notes',
        title: 'Patch Post 2',
        createdAt: '2024-11-17T17:38:02.0000000Z',
        iframeHtmlDocument: '<!doctype html><html><body><p>Patch 2</p></body></html>',
      },
    })
    getNewsPostsMock.mockResolvedValue(createPostListResponse(13, null))

    renderPatchPage('/patch?category_id=3')

    expect(await screen.findByText('Patch Post 13')).toBeInTheDocument()

    const scrollViewportElement = screen.getByTestId('patch-scroll-viewport')
    scrollViewportElement.scrollTop = 280

    fireEvent.click(screen.getByText('Patch Post 2'))

    expect(await screen.findByRole('heading', { name: 'Patch Post 2' })).toBeInTheDocument()
    const selectedNewsPostHeader = screen.getByTestId('selected-news-post-header')

    expect(
      within(selectedNewsPostHeader).getByRole('button', { name: /back to list/i }),
    ).toBeInTheDocument()
    expect(within(selectedNewsPostHeader).getByRole('heading', { name: 'Patch Post 2' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /back to list/i }))

    await waitFor(() => {
      expect(screen.getByText('Patch Post 13')).toBeInTheDocument()
      expect(screen.getByTestId('location-search')).toHaveTextContent('?category_id=3')
      expect(scrollViewportElement.scrollTop).toBe(280)
    })
  })

  it('preserves an invalid post_id in the URL and shows the detail not-found state', async () => {
    getNewsCategoriesMock.mockResolvedValue(defaultCategoriesResponse)
    getNewsPostDetailMock.mockRejectedValue(
      new HttpClientError({
        data: {
          message: 'Not found',
        },
        method: 'GET',
        status: 404,
        statusText: 'Not Found',
        url: '/api/v1/news/posts/999',
      }),
    )
    getNewsPostsMock.mockResolvedValue(createPostListResponse(2, null))

    renderPatchPage('/patch?category_id=3&post_id=999')

    expect(await screen.findByText(/article not found/i)).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent('?category_id=3&post_id=999')
    expect(screen.queryByRole('heading', { name: 'Posts' })).not.toBeInTheDocument()
    expect(screen.queryByText('Patch Post 1')).not.toBeInTheDocument()
  })

  it('requests the next page when the bottom probe intersects and keeps loading while items length equals pageSize', async () => {
    getNewsCategoriesMock.mockResolvedValue(defaultCategoriesResponse)
    getNewsPostsMock
      .mockResolvedValueOnce(createPostListResponse(13, '2024-11-17T17:38:37.0000000Z_13'))
      .mockResolvedValueOnce(createPostListResponse(1, null))

    renderPatchPage('/patch?category_id=3')

    expect(await screen.findByText('Patch Post 13')).toBeInTheDocument()

    await triggerBottomProbeIntersection()

    await waitFor(() => {
      expect(getNewsPostsMock).toHaveBeenCalledTimes(2)
      expect(getNewsPostsMock).toHaveBeenLastCalledWith({
        categoryId: 3,
        cursor: '2024-11-17T17:38:37.0000000Z_13',
        pageSize: 13,
      })
    })

    await triggerBottomProbeIntersection()

    await waitFor(() => {
      expect(getNewsPostsMock).toHaveBeenCalledTimes(2)
    })
  })

  it('keeps already loaded posts visible when loading more fails', async () => {
    getNewsCategoriesMock.mockResolvedValue(defaultCategoriesResponse)
    getNewsPostsMock
      .mockResolvedValueOnce(createPostListResponse(13, '2024-11-17T17:38:37.0000000Z_13'))
      .mockRejectedValueOnce(new Error('network'))

    renderPatchPage('/patch?category_id=3')

    expect(await screen.findByText('Patch Post 13')).toBeInTheDocument()

    await triggerBottomProbeIntersection()

    expect(await screen.findByText(/unable to load more posts right now/i)).toBeInTheDocument()
    expect(screen.getByText('Patch Post 1')).toBeInTheDocument()
  })
})
