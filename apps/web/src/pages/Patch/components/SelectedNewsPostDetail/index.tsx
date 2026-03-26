import type { CSSProperties, RefObject } from 'react'

import type { NewsPostDetail } from '../../index.service'
import styles from './index.module.scss'

type SelectedNewsPostDetailProps = {
  handleLoadSelectedNewsPostFrame: () => void
  handleReturnToNewsPosts: () => void
  selectedNewsPost: NewsPostDetail
  selectedNewsPostFrameHeight: number
  selectedNewsPostFrameRef: RefObject<HTMLIFrameElement | null>
}

const SelectedNewsPostDetail = ({
  handleLoadSelectedNewsPostFrame,
  handleReturnToNewsPosts,
  selectedNewsPost,
  selectedNewsPostFrameHeight,
  selectedNewsPostFrameRef,
}: SelectedNewsPostDetailProps) => {
  const selectedNewsPostDetailStyle = {
    '--selected-news-post-frame-height': `${selectedNewsPostFrameHeight}px`,
  } as CSSProperties

  return (
    <div className={styles.root} style={selectedNewsPostDetailStyle}>
      <article className={styles.detailCard}>
        <div className={styles.detailMeta} data-testid="selected-news-post-header">
          <button
            aria-label="Back to list"
            className={styles.returnButton}
            onClick={handleReturnToNewsPosts}
            type="button"
          >
            <svg
              aria-hidden="true"
              className={styles.returnButtonIcon}
              viewBox="0 0 1024 1024"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M716.203 857.728a46.59 46.59 0 0 1-1.238 67.541c-19.626 18.347-50.944 17.792-69.888-1.194l-375.21-375.211a46.59 46.59 0 0 1-.384-65.963l373.76-382.592c18.773-19.2 50.048-20.053 69.93-1.962 19.84 18.09 20.736 48.341 2.006 67.498l-341.334 349.44z" />
            </svg>
          </button>

          <div className={styles.detailMetaContent}>
            <p className={styles.detailCategory}>{selectedNewsPost.categoryName}</p>
            <h3>{selectedNewsPost.title}</h3>
            <time>{selectedNewsPost.createdAt}</time>
          </div>
        </div>

        <iframe
          className={styles.detailFrame}
          onLoad={handleLoadSelectedNewsPostFrame}
          ref={selectedNewsPostFrameRef}
          sandbox="allow-same-origin allow-popups"
          srcDoc={selectedNewsPost.iframeHtmlDocument}
          title="Selected article content"
        />
      </article>
    </div>
  )
}

export default SelectedNewsPostDetail
