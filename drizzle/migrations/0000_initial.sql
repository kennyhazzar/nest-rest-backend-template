CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TYPE "RoleType" AS ENUM ('admin', 'manager', 'user', 'public');
--> statement-breakpoint
CREATE TYPE "Actions" AS ENUM ('create', 'read', 'update', 'delete');
--> statement-breakpoint
CREATE TYPE "Subjects" AS ENUM (
  'User',
  'UserAdmin',
  'UserRole',
  'File',
  'FileAdmin',
  'Notification',
  'AdminDashboard',
  'AdminAccessLog',
  'AdminSettings',
  'CaptchaAdmin'
);
--> statement-breakpoint
CREATE TYPE "Gender" AS ENUM ('male', 'female');
--> statement-breakpoint
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'auto', 'system');
--> statement-breakpoint
CREATE TYPE "FileFrom" AS ENUM ('USER', 'PUBLIC');
--> statement-breakpoint
CREATE TYPE "FileType" AS ENUM ('USER_FILE', 'IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER');
--> statement-breakpoint
CREATE TYPE "MailStatus" AS ENUM ('pending', 'sent', 'failed');
--> statement-breakpoint
CREATE TYPE "MailTemplateType" AS ENUM (
  'welcome',
  'reset-password',
  'contact-form',
  'magic-link-login',
  'oauth-first-login',
  'oauth-account-linked',
  'notification'
);
--> statement-breakpoint
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'INFO', 'WARNING', 'SUCCESS', 'ERROR');
--> statement-breakpoint
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'telegram', 'sms');
--> statement-breakpoint
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('pending', 'sent', 'failed');
--> statement-breakpoint
CREATE TYPE "captcha_template_type" AS ENUM ('image_text', 'math_expression');
--> statement-breakpoint
CREATE TYPE "captcha_template_status" AS ENUM ('draft', 'active', 'archived');
--> statement-breakpoint
CREATE TYPE "captcha_config_status" AS ENUM ('draft', 'active', 'archived');
--> statement-breakpoint
CREATE TYPE "captcha_difficulty" AS ENUM ('easy', 'medium', 'hard');
--> statement-breakpoint
CREATE TYPE "captcha_asset_status" AS ENUM ('available', 'reserved', 'used', 'expired', 'archived');
--> statement-breakpoint
CREATE TYPE "captcha_challenge_context" AS ENUM ('login', 'register', 'password_reset', 'api_sensitive_action');
--> statement-breakpoint
CREATE TYPE "captcha_challenge_status" AS ENUM ('pending', 'passed', 'failed', 'expired');
--> statement-breakpoint
CREATE TYPE "captcha_fallback_strategy" AS ENUM (
  'deny_suspicious_allow_trusted',
  'allow_with_delay',
  'deny_all_suspicious'
);
--> statement-breakpoint
CREATE TABLE "user_role" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "name" varchar(100) NOT NULL UNIQUE,
  "description" varchar(255) DEFAULT '',
  "type" "RoleType" DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "email" varchar(100) NOT NULL,
  "forgotConfirmKey" varchar,
  "emailConfirmKey" varchar,
  "verified" boolean DEFAULT false,
  "password" varchar(255),
  "name" varchar(100) NOT NULL,
  "surname" varchar(100) NOT NULL,
  "middleName" varchar(100),
  "phone" varchar(20),
  "roleId" uuid NOT NULL REFERENCES "user_role"("id") ON DELETE SET NULL,
  "gender" "Gender" DEFAULT 'male',
  "birthday" timestamp with time zone,
  "blocked" boolean DEFAULT false,
  "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
  "failedLoginWindowStartedAt" timestamp with time zone,
  "lockedUntil" timestamp with time zone,
  "country" varchar(2) DEFAULT 'RU',
  "language" varchar(6) DEFAULT 'ru',
  "locale" varchar(6) DEFAULT 'ru_RU',
  "theme" "Theme" DEFAULT 'light',
  "notificationChannels" jsonb
);
--> statement-breakpoint
CREATE TABLE "role_permission" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "roleType" "RoleType" NOT NULL,
  "action" "Actions" NOT NULL,
  "subject" "Subjects" NOT NULL,
  "description" varchar(255),
  "isActive" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "refresh" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "refreshToken" text NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "isRevoked" boolean NOT NULL,
  "fingerprint" text NOT NULL,
  "userAgent" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_token" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expiresAt" timestamp with time zone NOT NULL,
  "isUsed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_link_token" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "email" varchar(255) NOT NULL,
  "token" text NOT NULL UNIQUE,
  "expiresAt" timestamp with time zone NOT NULL,
  "isUsed" boolean DEFAULT false,
  "fingerprint" text NOT NULL,
  "userAgent" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file-version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "mimetype" varchar NOT NULL,
  "size" integer NOT NULL,
  "versionId" varchar NOT NULL,
  "fileId" uuid,
  "userId" uuid REFERENCES "user"("id")
);
--> statement-breakpoint
CREATE TABLE "file" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "name" varchar(255) NOT NULL,
  "path" varchar NOT NULL,
  "module" "FileFrom" NOT NULL,
  "externalId" uuid NOT NULL,
  "description" text,
  "type" "FileType" DEFAULT 'OTHER',
  "lastVersionId" uuid REFERENCES "file-version"("id"),
  "userId" uuid NOT NULL REFERENCES "user"("id")
);
--> statement-breakpoint
ALTER TABLE "file-version" ADD CONSTRAINT "file-version_fileId_file_id_fk" FOREIGN KEY ("fileId") REFERENCES "file"("id");
--> statement-breakpoint
CREATE TABLE "mail_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "name" "MailTemplateType" NOT NULL,
  "subject" varchar(500) NOT NULL,
  "content" text,
  "isActive" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "mail" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "to" varchar(255) NOT NULL,
  "subject" varchar(500) NOT NULL,
  "templateId" uuid NOT NULL REFERENCES "mail_template"("id") ON DELETE CASCADE,
  "status" "MailStatus" DEFAULT 'pending',
  "variables" jsonb NOT NULL,
  "attempts" integer DEFAULT 0,
  "errorMessage" text,
  "sentAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "name" varchar(100) NOT NULL,
  "subject" varchar(500) NOT NULL,
  "content" text NOT NULL,
  "isActive" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "notification" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "deletedAt" timestamp with time zone,
  "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "type" "NotificationType" DEFAULT 'INFO',
  "channel" "NotificationChannel" DEFAULT 'in_app' NOT NULL,
  "status" "NotificationDeliveryStatus" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "nextAttemptAt" timestamp with time zone,
  "sentAt" timestamp with time zone,
  "failedAt" timestamp with time zone,
  "errorMessage" text,
  "isRead" boolean DEFAULT false,
  "metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "access_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "userId" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "email" varchar(255),
  "action" varchar(64) NOT NULL,
  "ipAddress" varchar(64),
  "userAgent" text,
  "details" text
);
--> statement-breakpoint
CREATE TABLE "system_setting" (
  "key" varchar(128) PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captcha_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "code" varchar(128) NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" "captcha_template_type" DEFAULT 'image_text' NOT NULL,
  "status" "captcha_template_status" DEFAULT 'draft' NOT NULL,
  "defaultDifficulty" "captcha_difficulty" DEFAULT 'medium' NOT NULL,
  "generator" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captcha_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "activatedAt" timestamp with time zone,
  "templateId" uuid NOT NULL REFERENCES "captcha_template"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "status" "captcha_config_status" DEFAULT 'draft' NOT NULL,
  "configJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdByUserId" uuid REFERENCES "user"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE "captcha_asset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "generatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "templateId" uuid NOT NULL REFERENCES "captcha_template"("id") ON DELETE CASCADE,
  "configId" uuid NOT NULL REFERENCES "captcha_config"("id") ON DELETE CASCADE,
  "storageKey" text NOT NULL,
  "answerHash" text NOT NULL,
  "answerNormalizedHash" text NOT NULL,
  "difficulty" "captcha_difficulty" DEFAULT 'medium' NOT NULL,
  "status" "captcha_asset_status" DEFAULT 'available' NOT NULL,
  "usedCount" integer DEFAULT 0 NOT NULL,
  "maxUses" integer DEFAULT 1 NOT NULL,
  "metadataJson" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captcha_challenge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "completedAt" timestamp with time zone,
  "expiresAt" timestamp with time zone NOT NULL,
  "assetId" uuid NOT NULL REFERENCES "captcha_asset"("id") ON DELETE RESTRICT,
  "context" "captcha_challenge_context" DEFAULT 'login' NOT NULL,
  "subjectHash" text,
  "riskScore" integer DEFAULT 0 NOT NULL,
  "status" "captcha_challenge_status" DEFAULT 'pending' NOT NULL,
  "attemptsCount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "captcha_attempt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "challengeId" uuid NOT NULL REFERENCES "captcha_challenge"("id") ON DELETE CASCADE,
  "answerHash" text NOT NULL,
  "isSuccess" boolean DEFAULT false NOT NULL,
  "solveTimeMs" integer,
  "ipHash" text,
  "userAgentHash" text
);
--> statement-breakpoint
CREATE TABLE "captcha_policy" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
  "context" "captcha_challenge_context" NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "minRiskForCaptcha" integer DEFAULT 60 NOT NULL,
  "difficultyStrategy" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "fallbackStrategy" "captcha_fallback_strategy" DEFAULT 'deny_suspicious_allow_trusted' NOT NULL,
  "poolLowWatermark" integer DEFAULT 20 NOT NULL,
  "poolTargetSize" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_email" ON "user" ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_version_file" ON "file-version" ("versionId", "fileId");
--> statement-breakpoint
CREATE UNIQUE INDEX "U_name_module_externalId" ON "file" ("name", "module", "externalId");
--> statement-breakpoint
CREATE UNIQUE INDEX "U_name_path" ON "file" ("name", "path");
--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_mail_template_name" ON "mail_template" ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "IDX_notification_template_name" ON "notification_template" ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_captcha_template_code" ON "captcha_template" ("code");
--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_captcha_config_template_version" ON "captcha_config" ("templateId", "version");
--> statement-breakpoint
CREATE UNIQUE INDEX "UQ_captcha_policy_context" ON "captcha_policy" ("context");
--> statement-breakpoint
CREATE INDEX "idx_user_role_type" ON "user_role" ("type");
--> statement-breakpoint
CREATE INDEX "isactive_role_permission_idx" ON "role_permission" ("isActive", "roleType", "action", "subject");
--> statement-breakpoint
CREATE INDEX "IDX_prt_userId" ON "password_reset_token" ("userId");
--> statement-breakpoint
CREATE INDEX "IDX_magic_link_token_email" ON "magic_link_token" ("email");
--> statement-breakpoint
CREATE INDEX "idx_file_module" ON "file" ("module");
--> statement-breakpoint
CREATE INDEX "IDX_notification_userId" ON "notification" ("userId");
--> statement-breakpoint
CREATE INDEX "IDX_notification_status" ON "notification" ("status");
--> statement-breakpoint
CREATE INDEX "IDX_access_log_userId" ON "access_log" ("userId");
--> statement-breakpoint
CREATE INDEX "IDX_access_log_createdAt" ON "access_log" ("createdAt");
--> statement-breakpoint
CREATE INDEX "IDX_access_log_action" ON "access_log" ("action");
--> statement-breakpoint
CREATE INDEX "IDX_captcha_template_status" ON "captcha_template" ("status");
--> statement-breakpoint
CREATE INDEX "IDX_captcha_asset_pool" ON "captcha_asset" ("templateId", "difficulty", "status", "expiresAt");
--> statement-breakpoint
CREATE INDEX "IDX_captcha_challenge_status_expiresAt" ON "captcha_challenge" ("status", "expiresAt");
--> statement-breakpoint
CREATE INDEX "IDX_captcha_attempt_challengeId" ON "captcha_attempt" ("challengeId");
