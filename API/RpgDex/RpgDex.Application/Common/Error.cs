using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Common
{
    public record Error(string Code, string Message)
    {
        public static readonly Error None = new(string.Empty, string.Empty);
        public static readonly Error InvalidUserId = new("COMMON_INVALID_USER_ID", "Invalid User ID format.");
        public static readonly Error UploadImageFailed = new("COMMON_UPLOAD_IMAGE_FAILED", "Failed to upload image.");
        public static Error Validation(string detail) => new("COMMON_VALIDATION_ERROR", detail);

        //Campaigns methods needs refactoring, this error is a placeholder to erros that can't be refactored now
        //THIS IS A TEMPORARY SOLUTION, PLEASE REFACTOR THE CAMPAIGN METHODS AND REMOVE THIS ERROR
        //just so api can compile and run
        public static readonly Error RefactorPlaceholder = new("COMMON_REFACTOR_ERROR", "This error is a placeholder for unrefactored code.");
    }

    public static class AuthError
    {
        public static readonly Error UserNotFound = new("AUTH_USER_NOT_FOUND", "User not found or not logged in.");
        public static readonly Error InvalidCredentials = new("AUTH_INVALID_CREDENTIALS", "Invalid user credentials.");
        public static readonly Error EmailNotConfirmed = new("AUTH_EMAIL_NOT_CONFIRMED", "Email is not confirmed.");
        public static readonly Error InvalidTwoFactorCode = new("AUTH_INVALID_TWO_FACTOR_CODE", "Invalid two-factor code or request.");
        public static readonly Error TwoFactorActivationFailed = new("AUTH_TWO_FACTOR_ACTIVATION_FAILED", "Unable to activate Two-Factor Authentication.");
        public static readonly Error InvalidToken = new("AUTH_INVALID_TOKEN", "Token is invalid or expired.");
        public static readonly Error ExpiredRefreshToken = new("AUTH_EXPIRED_REFRESH_TOKEN", "Refresh token is expired or invalid.");
        public static readonly Error TokenGenerationFailed = new("AUTH_TOKEN_GENERATION_FAILED", "Could not generate a new token.");
        public static readonly Error UserCreationFailed = new("AUTH_USER_CREATION_FAILED", "An error occurred while creating the user.");
        public static readonly Error AccountLinkingFailed = new("AUTH_ACCOUNT_LINKING_FAILED", "An error occurred while linking the external account.");
        public static readonly Error EmailSendFailed = new("AUTH_EMAIL_SEND_FAILED", "An error occurred while sending the email.");
    }

    public static class CampaignError
    {
        public static readonly Error NotFound = new("CAMPAIGN_NOT_FOUND", "Campaign not found.");
        public static readonly Error NotGameMaster = new("CAMPAIGN_NOT_GAME_MASTER", "Only the game master can perform this action.");
        public static readonly Error InvalidPassword = new("CAMPAIGN_INVALID_PASSWORD", "Invalid campaign password.");
        public static readonly Error PlayerNotFound = new("CAMPAIGN_PLAYER_NOT_FOUND", "Player was not found in this campaign.");
        public static readonly Error AlreadyInCampaign = new("CAMPAIGN_ALREADY_IN_CAMPAIGN", "User is already a player in this campaign.");
        public static readonly Error CannotReduceCapacity = new("CAMPAIGN_CANNOT_REDUCE_CAPACITY", "Remove players before reducing campaign capacity.");
        public static readonly Error GameMasterCannotLeave = new("CAMPAIGN_GM_CANNOT_LEAVE", "The Game Master cannot leave the campaign.");
        public static readonly Error NotAPlayer = new("CAMPAIGN_NOT_A_PLAYER", "You are not a player in this campaign.");
        public static readonly Error CreateFailed = new("CAMPAIGN_CREATE_FAILED", "Failed to create campaign.");
        public static readonly Error UpdateFailed = new("CAMPAIGN_UPDATE_FAILED", "Failed to update campaign.");
        public static readonly Error ChatNotFound = new("CAMPAIGN_CHAT_NOT_FOUND", "Failed to retrieve campaign chat.");
        public static readonly Error SaveMessageFailed = new("CAMPAIGN_SAVE_MESSAGE_FAILED", "Failed to save new chat message.");
        public static readonly Error IsNotActive = new("CAMPAIGN_IS_NOT_ACTIVE", "Campaign is not active.");
    }

    public static class CharacterError
    {
        public static readonly Error NotFound = new("CHARACTER_NOT_FOUND", "Character not found.");
        public static readonly Error CharacterNotOwned = new("CHARACTER_NOT_OWNED", "Character does not belong to the logged-in user.");
        public static readonly Error PushToUserFailed = new("CHARACTER_PUSH_TO_USER_FAILED", "Failed to add character to user.");
        public static readonly Error SetActiveStateFailed = new("CHARACTER_SET_ACTIVE_STATE_FAILED", "Failed to change character active state.");
        public static readonly Error UpdateFailed = new("CHARACTER_UPDATE_FAILED", "It was not possible to update character.");
        public static readonly Error UpdateLastAccessFailed = new("CHARACTER_UPDATE_LAST_ACCESS_FAILED", "Failed to update last access time.");
    }

    public static class UserError
    {
        public static readonly Error UpdateFailed = new("USER_UPDATE_FAILED", "Failed to update user profile.");
        public static Error IdentityError(string description) => new("USER_IDENTITY_ERROR", description);
    }
}

