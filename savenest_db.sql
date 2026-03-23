-- SaveNest clean schema + seed data
-- Compatible with MySQL / MariaDB

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS `savenest_db`;
CREATE DATABASE `savenest_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `savenest_db`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `country` (
  `id_country` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `country_name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_country`),
  UNIQUE KEY `uk_country_name` (`country_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `language_` (
  `id_language` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `language_name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_language`),
  UNIQUE KEY `uk_language_name` (`language_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id_roles` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `roles_name` VARCHAR(50) NOT NULL,
  `right_` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_roles`),
  UNIQUE KEY `uk_roles_name` (`roles_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `savenest` (
  `id_savenest` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `date_inscription` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_savenest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `favs` (
  `id_favs` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_favs` VARCHAR(150) NOT NULL,
  `url_favs` VARCHAR(500) DEFAULT NULL,
  `added_date` DATE DEFAULT NULL,
  `logo` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id_favs`),
  UNIQUE KEY `uk_title_favs` (`title_favs`),
  UNIQUE KEY `uk_url_favs` (`url_favs`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_` (
  `id_user` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pseudo` VARCHAR(50) NOT NULL,
  `mail` VARCHAR(150) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `id_savenest` INT UNSIGNED NOT NULL,
  `id_country` INT UNSIGNED NOT NULL,
  `id_roles` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `uk_user_pseudo` (`pseudo`),
  UNIQUE KEY `uk_user_mail` (`mail`),
  KEY `idx_user_savenest` (`id_savenest`),
  KEY `idx_user_country` (`id_country`),
  KEY `idx_user_roles` (`id_roles`),
  CONSTRAINT `fk_user_savenest`
    FOREIGN KEY (`id_savenest`) REFERENCES `savenest` (`id_savenest`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_country`
    FOREIGN KEY (`id_country`) REFERENCES `country` (`id_country`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles`
    FOREIGN KEY (`id_roles`) REFERENCES `roles` (`id_roles`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `category` (
  `id_category` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(50) NOT NULL,
  `confidentiality` TINYINT(1) NOT NULL DEFAULT 0,
  `password` VARCHAR(255) DEFAULT NULL,
  `id_user` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_category`),
  UNIQUE KEY `uk_category_user_name` (`id_user`, `category_name`),
  KEY `idx_category_user` (`id_user`),
  CONSTRAINT `fk_category_user`
    FOREIGN KEY (`id_user`) REFERENCES `user_` (`id_user`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `speaking` (
  `id_user` INT UNSIGNED NOT NULL,
  `id_language` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_user`, `id_language`),
  KEY `idx_speaking_language` (`id_language`),
  CONSTRAINT `fk_speaking_user`
    FOREIGN KEY (`id_user`) REFERENCES `user_` (`id_user`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_speaking_language`
    FOREIGN KEY (`id_language`) REFERENCES `language_` (`id_language`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `save_` (
  `id_category` INT UNSIGNED NOT NULL,
  `id_favs` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_category`, `id_favs`),
  KEY `idx_save_favs` (`id_favs`),
  CONSTRAINT `fk_save_category`
    FOREIGN KEY (`id_category`) REFERENCES `category` (`id_category`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_save_favs`
    FOREIGN KEY (`id_favs`) REFERENCES `favs` (`id_favs`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `country` (`id_country`, `country_name`) VALUES
(1, 'France'),
(2, 'Belgium'),
(3, 'Canada'),
(4, 'Germany'),
(5, 'Spain');

INSERT INTO `language_` (`id_language`, `language_name`) VALUES
(1, 'French'),
(2, 'English'),
(3, 'Spanish'),
(4, 'German'),
(5, 'Japanese');

INSERT INTO `roles` (`id_roles`, `roles_name`, `right_`) VALUES
(1, 'ADMIN', 1),
(2, 'USER', 0),
(3, 'MODERATOR', 1);

INSERT INTO `savenest` (`id_savenest`, `date_inscription`) VALUES
(1, '2026-02-20 14:08:47'),
(2, '2026-02-20 14:08:47'),
(3, '2026-02-20 14:08:47');

INSERT INTO `user_` (`id_user`, `pseudo`, `mail`, `password`, `id_savenest`, `id_country`, `id_roles`) VALUES
(1, 'Neo', 'neo@savenest.test', '$2b$10$FAKEHASHneo', 1, 1, 2),
(2, 'Trinity', 'trinity@savenest.test', '$2b$10$FAKEHASHtrinity', 2, 3, 2),
(3, 'Morpheus', 'morpheus@savenest.test', '$2b$10$FAKEHASHmorpheus', 3, 2, 1);

INSERT INTO `category` (`id_category`, `category_name`, `confidentiality`, `password`, `id_user`) VALUES
(1, 'Streaming', 0, NULL, 1),
(2, 'Gaming', 0, NULL, 1),
(3, 'Lectures', 1, 'Test123', 1),
(4, 'Movies To Watch', 0, NULL, 1),
(5, 'Youtube for Later', 1, 'Test123', 1);

INSERT INTO `favs` (`id_favs`, `title_favs`, `url_favs`, `added_date`, `logo`) VALUES
(1, 'My Canal', 'https://www.canalplus.com/', '2024-03-15', NULL),
(2, 'Disney Plus', 'https://www.disneyplus.com/fr-fr/home', '2024-03-15', NULL),
(3, 'Netflix', 'https://www.netflix.com/browse', '2024-03-15', NULL),
(4, 'Amazon Prime Video', 'https://www.primevideo.com/storefront/home/ref=atv_nb_sf_hm', '2024-03-15', NULL),
(5, 'ADN', 'https://animationdigitalnetwork.fr/', '2024-03-15', NULL),
(6, 'Movix', 'https://movix.club/', NULL, NULL),
(7, 'Voir Anime', 'https://voiranime.com/', NULL, NULL),
(8, 'Elden Ring Wiki', 'https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki', NULL, NULL),
(9, 'Boss Help Elden Ring', 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/bosses_stats_map_elden_ring_wiki_guide_1584px.jpg?v=1647964271725', NULL, NULL),
(10, 'Boss Help Elden Ring lvl recommandation', 'https://www.spieltimes.io/news/elden-ring-all-bosses-recommended-levels-and-location/', NULL, NULL),
(11, 'Black Bow Build Elden Ring', 'https://www.reddit.com/r/Eldenring/comments/t83jcy/guide_bow_tips_and_tricks_after_completing_my', NULL, NULL),
(12, 'PokedDex Tracker Living Dex', 'https://pokedextracker.com/u/MTJL/living-dex', NULL, NULL),
(13, 'Line ups Valo', 'https://strats.gg/game/valorant/lineups', NULL, NULL),
(14, 'Cyberpunk Netrunner build', 'https://gamestegy.com/post/cyberpunk-2077/698/netrunner-build#mcetoc_1fv422e9d7', NULL, NULL),
(15, 'LOR POC Spreadsheet', 'https://docs.google.com/spreadsheets/u/0/d/1FePMz4o3tbiWcz0nHZYu0aAHknbIfb9anWfQCVtvtKk/htmlview#', NULL, NULL),
(16, 'LOR POC XP Spreadsheet', 'https://docs.google.com/spreadsheets/d/1tmcROrNKN4dAPnmckIaSd-lRVz4UuJMSYpg_PRaZRN8/edit#gid=927209007', NULL, NULL),
(17, 'BG 3 Beast Master Ranger Build', 'https://fextralife.com/baldurs-gate-3-beast-master-ranger-build-guide/', NULL, NULL),
(18, 'LOL Graph', 'https://lolalytics.com/lol/tierlist/?view=tier', NULL, NULL),
(19, 'Scan LELMANGA', 'https://www.lelmanga.com/', NULL, NULL),
(20, 'One Piece : 1137', NULL, NULL, NULL),
(21, 'Ippo : 1376', NULL, NULL, NULL),
(22, 'Kingdom : 702', NULL, NULL, NULL),
(23, 'One Punch Man : 218', NULL, NULL, NULL),
(24, 'Quinn Fanfiction', 'https://www.reddit.com/r/collectionoferrors/comments/so9idk/the_tales_we_tell_chapter_0_prologue/', NULL, NULL);

INSERT INTO `speaking` (`id_user`, `id_language`) VALUES
(1, 1),
(1, 2),
(1, 5),
(2, 2),
(2, 3),
(3, 1),
(3, 2),
(3, 4);

INSERT INTO `save_` (`id_category`, `id_favs`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(1, 7),
(2, 8),
(2, 9),
(2, 10),
(2, 11),
(2, 12),
(2, 13),
(2, 14),
(2, 15),
(2, 16),
(2, 17),
(2, 18),
(3, 19),
(3, 20),
(3, 21),
(3, 22),
(3, 23),
(3, 24);

ALTER TABLE `country` AUTO_INCREMENT = 6;
ALTER TABLE `language_` AUTO_INCREMENT = 6;
ALTER TABLE `roles` AUTO_INCREMENT = 4;
ALTER TABLE `savenest` AUTO_INCREMENT = 4;
ALTER TABLE `user_` AUTO_INCREMENT = 4;
ALTER TABLE `category` AUTO_INCREMENT = 6;
ALTER TABLE `favs` AUTO_INCREMENT = 25;
