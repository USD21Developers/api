# ************************************************************
# Sequel Ace SQL dump
# Version 20035
#
# https://sequel-ace.com/
# https://github.com/Sequel-Ace/Sequel-Ace
#
# Host: localhost (MySQL 8.0.23)
# Database: invites
# Generation Time: 2022-10-31 19:20:06 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE='NO_AUTO_VALUE_ON_ZERO', SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table events
# ------------------------------------------------------------

CREATE TABLE `events` (
  `eventid` int unsigned NOT NULL AUTO_INCREMENT,
  `churchid` int unsigned NOT NULL,
  `type` enum('bible talk','church','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `locationcoordinates` point DEFAULT NULL,
  `otherlocationdetails` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `virtualconnectiondetails` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `hasvirtual` tinyint unsigned NOT NULL DEFAULT '0',
  `contactfirstname` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactlastname` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contactemail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contactphone` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contactphonecountrydata` json DEFAULT NULL,
  `country` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lang` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdBy` int NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`eventid`),
  KEY `church` (`churchid`) /*!80000 INVISIBLE */,
  KEY `lang` (`lang`,`country`,`churchid`) /*!80000 INVISIBLE */,
  KEY `startdate` (`startdate`) /*!80000 INVISIBLE */,
  KEY `multiday` (`multidaybegindate`,`multidayenddate`) /*!80000 INVISIBLE */,
  KEY `virtual` (`hasvirtual` DESC) /*!80000 INVISIBLE */,
  KEY `isDeleted` (`isDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table follow
# ------------------------------------------------------------

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

CREATE TABLE `interactions` (
  `interactionid` int unsigned NOT NULL AUTO_INCREMENT,
  `invitationid` int unsigned NOT NULL,
  `userid` int unsigned NOT NULL,
  `interactiontype` enum('clicked link','added to calendar','rsvp') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`interactionid`),
  KEY `INDEX_interactiontype` (`interactiontype`) /*!80000 INVISIBLE */,
  KEY `INDEX_invitationid` (`invitationid`) /*!80000 INVISIBLE */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table invitations
# ------------------------------------------------------------

CREATE TABLE `invitations` (
  `invitationid` int unsigned NOT NULL AUTO_INCREMENT,
  `eventid` int unsigned DEFAULT NULL,
  `userid` int unsigned DEFAULT NULL,
  `recipientid` char(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timesclicked` int unsigned NOT NULL DEFAULT '0',
  `recipientname` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `recipientsms` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `recipientemail` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sharedvia` enum('sms','email','qrcode') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sharedfromcoordinates` point DEFAULT NULL,
  `lang` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invitedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`invitationid`),
  UNIQUE KEY `UNIQUE_userrecipient` (`userid`,`recipientid`),
  KEY `INDEX_users` (`userid`),
  KEY `INDEX_events` (`eventid`) /*!80000 INVISIBLE */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table photoreview
# ------------------------------------------------------------

CREATE TABLE `photoreview` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `userid` int unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userid` (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table rsvp
# ------------------------------------------------------------

CREATE TABLE `rsvp` (
  `rsvpid` int unsigned NOT NULL AUTO_INCREMENT,
  `invitationid` int unsigned NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rsvpid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table tokens
# ------------------------------------------------------------

CREATE TABLE `tokens` (
  `token` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL COMMENT 'require("crypto").randomBytes(32).toString("hex")',
  `expiry` datetime NOT NULL,
  `purpose` enum('registration','password reset') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'registration',
  `userid` int unsigned NOT NULL,
  `claimed` tinyint unsigned NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  UNIQUE KEY `token_UNIQUE` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;



# Dump of table users
# ------------------------------------------------------------

CREATE TABLE `users` (
  `userid` int unsigned NOT NULL AUTO_INCREMENT,
  `churchid` int unsigned DEFAULT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `password` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `passwordmustchange` tinyint unsigned NOT NULL DEFAULT '0',
  `firstname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `lastname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `gender` enum('male','female') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `usertype` enum('sysadmin','user') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'user',
  `userstatus` enum('pending confirmation','registered','frozen') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'pending confirmation',
  `profilephoto` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `lang` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'en',
  `country` char(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'us',
  `datakey` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `isAuthorized` tinyint NOT NULL DEFAULT '0',
  `canAuthorize` tinyint NOT NULL DEFAULT '0',
  `canAuthToAuth` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userid`),
  UNIQUE KEY `username_UNIQUE` (`username`),
  UNIQUE KEY `email_UNIQUE` (`email`),
  KEY `name` (`lastname`,`firstname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
