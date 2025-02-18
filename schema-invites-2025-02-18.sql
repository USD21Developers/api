# ************************************************************
# Sequel Ace SQL dump
# Version 20080
#
# https://sequel-ace.com/
# https://github.com/Sequel-Ace/Sequel-Ace
#
# Host: localhost (MySQL 8.0.23)
# Database: invites
# Generation Time: 2025-02-18 20:13:02 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE='NO_AUTO_VALUE_ON_ZERO', SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table bannedIPs
# ------------------------------------------------------------

DROP TABLE IF EXISTS `bannedIPs`;

CREATE TABLE `bannedIPs` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `ip` varbinary(16) NOT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ip` (`ip`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table churches
# ------------------------------------------------------------

DROP TABLE IF EXISTS `churches`;

CREATE TABLE `churches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `remoteid` int unsigned DEFAULT NULL,
  `name` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `place` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDeleted` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `remoteid` (`remoteid`)
) ENGINE=InnoDB AUTO_INCREMENT=18332 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table churchmaps
# ------------------------------------------------------------

DROP TABLE IF EXISTS `churchmaps`;

CREATE TABLE `churchmaps` (
  `churchid` int unsigned NOT NULL,
  `zoom` tinyint unsigned NOT NULL DEFAULT '10',
  `latitude` decimal(9,6) NOT NULL,
  `longitude` decimal(10,6) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`churchid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table events
# ------------------------------------------------------------

DROP TABLE IF EXISTS `events`;

CREATE TABLE `events` (
  `eventid` int unsigned NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `churchid` int unsigned NOT NULL,
  `createdBy` int unsigned NOT NULL,
  `type` enum('bible talk','church','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descriptionHeading` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequency` enum('once','Every Sunday','Every Monday','Every Tuesday','Every Wednesday','Every Thursday','Every Friday','Every Saturday') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `duration` enum('same day','multiple days') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `durationInHours` float DEFAULT NULL,
  `timezone` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `startdate` datetime DEFAULT NULL,
  `multidaybegindate` datetime DEFAULT NULL,
  `multidayenddate` datetime DEFAULT NULL,
  `locationvisibility` enum('public','discreet') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `locationname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `locationaddressline1` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `locationaddressline2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `locationaddressline3` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `locationcoordinates` point NOT NULL,
  `otherlocationdetails` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `virtualconnectiondetails` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sharewithfollowers` enum('yes','no') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'yes',
  `hasvirtual` tinyint unsigned NOT NULL DEFAULT '0',
  `contactfirstname` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactlastname` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contactemail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contactphone` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contactphonecountrydata` json DEFAULT NULL,
  `country` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lang` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `visibility` enum('all','hidden from followers') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`eventid`),
  KEY `church` (`churchid`) /*!80000 INVISIBLE */,
  KEY `lang` (`lang`,`country`,`churchid`) /*!80000 INVISIBLE */,
  KEY `startdate` (`startdate`) /*!80000 INVISIBLE */,
  KEY `multiday` (`multidaybegindate`,`multidayenddate`) /*!80000 INVISIBLE */,
  KEY `isDeleted` (`isDeleted`),
  KEY `virtual` (`hasvirtual`),
  SPATIAL KEY `idx_locationcoordinates` (`locationcoordinates`),
  KEY `createdBy` (`createdBy`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table follow
# ------------------------------------------------------------

DROP TABLE IF EXISTS `follow`;

CREATE TABLE `follow` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `follower` int unsigned NOT NULL,
  `followed` int unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `users` (`follower`,`followed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table interactions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `interactions`;

CREATE TABLE `interactions` (
  `interactionid` int unsigned NOT NULL AUTO_INCREMENT,
  `invitationid` int unsigned NOT NULL,
  `userid` int unsigned NOT NULL,
  `recipienttimezone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interactiontype` enum('viewed invite','added to calendar','rsvp','rescinded rsvp') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`interactionid`),
  KEY `INDEX_interactiontype` (`interactiontype`),
  KEY `INDEX_invitationid` (`invitationid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table invitations
# ------------------------------------------------------------

DROP TABLE IF EXISTS `invitations`;

CREATE TABLE `invitations` (
  `invitationid` int unsigned NOT NULL AUTO_INCREMENT,
  `isDeleted` tinyint(1) DEFAULT '0',
  `eventid` int unsigned DEFAULT NULL,
  `userid` int unsigned DEFAULT NULL,
  `recipientid` char(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastTimeNotifiedViaEmail` datetime DEFAULT NULL,
  `lastTimeNotifiedViaPush` datetime DEFAULT NULL,
  `recipientname` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `recipientsms` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `recipientemail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sharedvia` enum('sms','email','qrcode','whatsapp') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sharedfromcoordinates` point DEFAULT NULL,
  `sharedfromtimezone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lang` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `followup` tinyint unsigned NOT NULL DEFAULT '0',
  `unsubscribedFromEmail` tinyint unsigned NOT NULL DEFAULT '0',
  `unsubscribedFromEmailAt` datetime DEFAULT NULL,
  `unsubscribedFromPush` tinyint unsigned NOT NULL DEFAULT '0',
  `unsubscribedFromPushAt` datetime DEFAULT NULL,
  `invitedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`invitationid`),
  UNIQUE KEY `UNIQUE_userrecipient` (`userid`,`recipientid`),
  KEY `INDEX_users` (`userid`),
  KEY `INDEX_events` (`eventid`),
  KEY `isDeleted` (`isDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table logs_adminchanges
# ------------------------------------------------------------

DROP TABLE IF EXISTS `logs_adminchanges`;

CREATE TABLE `logs_adminchanges` (
  `logid` int unsigned NOT NULL AUTO_INCREMENT,
  `userid` int unsigned NOT NULL,
  `changed_by` json NOT NULL,
  `changed_by_userid` int unsigned NOT NULL,
  `user_before` json NOT NULL,
  `user_after` json NOT NULL,
  `hash_after` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`logid`),
  KEY `userid` (`userid`),
  KEY `changed_by_userid` (`changed_by_userid`),
  KEY `hash_after` (`hash_after`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table notes
# ------------------------------------------------------------

DROP TABLE IF EXISTS `notes`;

CREATE TABLE `notes` (
  `noteid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userid` int unsigned NOT NULL,
  `invitationid` int unsigned NOT NULL,
  `note` json NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`noteid`),
  KEY `inviteid` (`invitationid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table photoreview
# ------------------------------------------------------------

DROP TABLE IF EXISTS `photoreview`;

CREATE TABLE `photoreview` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userid` int unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userid` (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table preauth
# ------------------------------------------------------------

DROP TABLE IF EXISTS `preauth`;

CREATE TABLE `preauth` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `firstname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `churchid` int NOT NULL,
  `authorizedby` int unsigned NOT NULL,
  `authcode` char(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sentvia` enum('textmessage','whatsapp','email','qrcode') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'textmessage',
  `canAuthorize` tinyint unsigned NOT NULL DEFAULT '0',
  `canAuthToAuth` tinyint unsigned NOT NULL DEFAULT '0',
  `claimedAt` datetime DEFAULT NULL,
  `userid` int unsigned DEFAULT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `authcode` (`authcode`,`authorizedby`,`churchid`),
  KEY `userid` (`userid`),
  KEY `claimedAt` (`claimedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table pushsubscriptions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `pushsubscriptions`;

CREATE TABLE `pushsubscriptions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userid` int unsigned NOT NULL,
  `subscription` json NOT NULL,
  `subscription_endpoint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (json_unquote(json_extract(`subscription`,_utf8mb4'$.endpoint'))) VIRTUAL,
  `sha256hex` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expirationTime` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscription_endpoint` (`subscription_endpoint`),
  KEY `userid` (`userid`),
  KEY `hash` (`sha256hex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table rsvp
# ------------------------------------------------------------

DROP TABLE IF EXISTS `rsvp`;

CREATE TABLE `rsvp` (
  `rsvpid` int unsigned NOT NULL AUTO_INCREMENT,
  `invitationid` int unsigned NOT NULL,
  `arrivalAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rsvpid`),
  KEY `invitationid` (`invitationid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table tokens
# ------------------------------------------------------------

DROP TABLE IF EXISTS `tokens`;

CREATE TABLE `tokens` (
  `token` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'require("crypto").randomBytes(32).toString("hex")',
  `expiry` datetime NOT NULL,
  `purpose` enum('registration','authorization','password reset','church email') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'registration',
  `userid` int unsigned NOT NULL,
  `claimed` tinyint unsigned NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  UNIQUE KEY `token_UNIQUE` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;



# Dump of table users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `userid` int unsigned NOT NULL AUTO_INCREMENT,
  `churchid` int unsigned DEFAULT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `isAuthorized` tinyint NOT NULL DEFAULT '0',
  `canAuthorize` tinyint NOT NULL DEFAULT '0',
  `canAuthToAuth` tinyint NOT NULL DEFAULT '0',
  `authorizedby` int DEFAULT NULL,
  `datakey` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `passwordmustchange` tinyint unsigned NOT NULL DEFAULT '0',
  `firstname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `lastname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `churchEmailUnverified` tinyint NOT NULL DEFAULT '0',
  `gender` enum('male','female') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `usertype` enum('sysadmin','user') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'user',
  `userstatus` enum('pending confirmation','registered','frozen') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending confirmation',
  `profilephoto` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `profilephoto_flagged` varchar(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `lang` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'en',
  `country` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'us',
  `timezone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `settings` json NOT NULL,
  `cameToFaithViaApp` tinyint unsigned NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userid`),
  UNIQUE KEY `username_UNIQUE` (`username`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  KEY `name` (`lastname`,`firstname`),
  KEY `timezone` (`timezone`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
