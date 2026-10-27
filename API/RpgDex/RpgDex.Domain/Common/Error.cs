using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Common
{
    public record Error(string Code, string Message)
    {
        public static readonly Error None = new(string.Empty, string.Empty);
        public static readonly Error InvalidUserId = new("COMMON_INVALID_USER_ID", "Invalid User ID format.");
        public static readonly Error UploadImageFailed = new("COMMON_UPLOAD_IMAGE_FAILED", "Failed to upload image.");
        public static Error Validation(string detail) => new("COMMON_VALIDATION_ERROR", detail);

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
        public static readonly Error MaxPlayersReached = new("CAMPAIGN_MAX_PLAYERS_REACHED", "Failed to add player to campaign / max player capacity.");
        public static readonly Error MessageNotFound = new("CAMPAIGN_CHAT_MESSAGE_NOT_FOUND", "Chat message not found");
        public static readonly Error MessageForbidden = new("CAMPAIGN_CHAT_MESSAGE_FORBIDDEN", "Player is not the author of this message");
        public static readonly Error FailedToRestoreMessage = new("CAMPAIGN_CHAT_MESSAGE_RESTORE", "Failed to Restore Message");
        public static readonly Error CharacterAlreadyInCampaign = new("CAMPAIGN_CHARACTER_ALREADY_IN", "Character already in campaign.");
        public static readonly Error CharacterAwaitingApproval = new("CAMPAIGN_CHARACTER_AWAITING_APPROVAL", "Character awaiting approval.");
        public static readonly Error CharacterNotInRequests = new("CAMPAIGN_CHARACTER_NOT_IN_REQUESTS", "Character is not in the request list.");
        public static readonly Error CharacterNotInCampaign = new("CAMPAIGN_CHARACTER_NOT_IN_CAMPAIGN", "Character is not in the campaign.");
        public static readonly Error PlayerNotInCampaign = new("CAMPAIGN_PLAYER_NOT_IN_CAMPAIGN", "Player is not in campaign.");
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

    public static class UserDocumentError
    {
        public static readonly Error NotFound = new("USER_DOCUMENT_NOT_FOUND", "User document not found.");
        public static readonly Error NotOwned = new("USER_DOCUMENT_NOT_OWNED", "User is not the owner of the document.");
        public static readonly Error FileRequired = new("USER_DOCUMENT_FILE_REQUIRED", "File is required and cannot be empty.");
        public static readonly Error CreateFailed = new("USER_DOCUMENT_CREATE_FAILED", "Failed to create user document.");
        public static readonly Error UpdateFailed = new("USER_DOCUMENT_UPDATE_FAILED", "Failed to update user document.");
        public static readonly Error UploadFailed = new("USER_DOCUMENT_UPLOAD_FAILED", "Failed to upload file.");
    }

    public static class DiceLogError
    {
        public static readonly Error AddRollFailed = new("DICE_LOG_ADD_ROLL_FAILED", "Failed to save dice roll to the campaign log.");
        public static readonly Error LogNotFound = new("DICE_LOG_NOT_FOUND", "Dice roll log not found for this campaign.");
        public static readonly Error ExpressionRequired = new("DICE_LOG_EXPRESSION_REQUIRED", "Dice roll expression is required.");
        public static readonly Error InvalidExpression = new("DICE_LOG_INVALID_EXPRESSION", "Invalid dice expression.");
    }
    public static class ValidationErrorCodes
    {
        public const string GeneralEmpty = "VALIDATION_EMPTY";
        public const string GeneralMaxLength = "VALIDATION_MAX_LENGTH";
        public const string InvalidEmail = "VALIDATION_INVALID_EMAIL";
        public const string FileTooLarge = "VALIDATION_FILE_TOO_LARGE";
        public const string InvalidFileExtension = "VALIDATION_INVALID_FILE_EXTENSION";

        public const string PasswordEmpty = "VALIDATION_PASSWORD_EMPTY";
        public const string PasswordUppercase = "VALIDATION_PASSWORD_UPPERCASE";
        public const string PasswordLowercase = "VALIDATION_PASSWORD_LOWERCASE";
        public const string PasswordNumber = "VALIDATION_PASSWORD_NUMBER";
        public const string PasswordSpecial = "VALIDATION_PASSWORD_SPECIAL";

        public const string UserNameEmpty = "VALIDATION_USERNAME_EMPTY";
        public const string UserNameMaxLength = "VALIDATION_USERNAME_MAX_LENGTH";
        public const string UserNameNoSpaces = "VALIDATION_USERNAME_NO_SPACES";
        public const string UserNameInvalidChars = "VALIDATION_USERNAME_INVALID_CHARS";
        public const string DisplayNameEmpty = "VALIDATION_DISPLAYNAME_EMPTY";

        public const string CampaignIconRequired = "CAMPAIGN_VALIDATION_ICON_REQUIRED";
        public const string DocumentFileRequired = "DOCUMENT_VALIDATION_FILE_REQUIRED";
        public const string CanvasInvalidType = "CANVAS_INVALID_TYPE";
        public const string CanvasInvalidImage = "CANVAS_INVALID_IMAGE";
        public const string CanvasInvalidPoints = "CANVAS_INVALID_POINTS";
        public const string CanvasInvalidValue = "CANVAS_INVALID_VALUE";
        public const string CanvasInvalidColor = "CANVAS_INVALID_COLOR";
        public const string CanvasTooManyItems = "CANVAS_TOO_MANY_ITEMS";
    }
    public static class CanvaElementError
    {
        public static readonly Error NotFound = new("CANVAS_ELEMENT_NOT_FOUND", "Canvas element not found.");
        public static readonly Error CreateFailed = new("CANVAS_ELEMENT_CREATE_FAILED", "Failed to create canvas element.");
        public static readonly Error UpdateFailed = new("CANVAS_ELEMENT_UPDATE_FAILED", "Failed to update canvas element.");
        public static readonly Error MoveFailed = new("CANVAS_ELEMENT_MOVE_FAILED", "Failed to move canvas elements.");
        public static readonly Error ReorderFailed = new("CANVAS_ELEMENT_REORDER_FAILED", "Failed to reorder canvas elements.");
        public static readonly Error SetActiveStateFailed = new("CANVAS_ELEMENT_SET_ACTIVE_STATE_FAILED", "Failed to change canvas element active state.");
        public static readonly Error InvalidElement = new("CANVAS_ELEMENT_INVALID", "Element data does not match its type.");
        public static readonly Error ImageTooLarge = new("CANVAS_ELEMENT_IMAGE_TOO_LARGE", "Image is too large.");
        public static readonly Error TooManyPoints = new("CANVAS_ELEMENT_TOO_MANY_POINTS", "Drawing has too many points.");
        public static readonly Error TooManyItems = new("CANVAS_ELEMENT_TOO_MANY_ITEMS", "Invalid number of elements in the request.");
        public static readonly Error LimitReached = new("CANVAS_ELEMENT_LIMIT_REACHED", "Canvas element limit reached.");
    }
}

