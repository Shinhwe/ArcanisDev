public sealed record CurrentUserProfileResponse(
    AuthUserResponse User,
    UserGameAccountResponse GameAccount);

public sealed record UserGameAccountResponse(
    int DonationPoints,
    bool IsLinked,
    int MaplePoints,
    int NxPrepaid,
    int VotePoints);
