import { HttpClient } from '../../app/http/HttpClient'

type VoteEligibilityStatus = 'login_required' | 'link_required' | 'cooldown' | 'eligible'

type VoteEligibilityResponse = {
  canVote: boolean
  hasLinkedGameAccount: boolean
  message: string
  nextEligibleAt: string | null
  status: VoteEligibilityStatus
  voteIntervalHours: number
}

export const getVoteEligibility = async (): Promise<VoteEligibilityResponse> => {
  const requestUrl = '/votes/eligibility'

  return HttpClient.get<VoteEligibilityResponse>(requestUrl)
    .then((responseData) => {
      return Promise.resolve(responseData)
    })
    .catch((error) => {
      return Promise.reject(error)
    })
}

export type {
  VoteEligibilityResponse,
  VoteEligibilityStatus,
}
