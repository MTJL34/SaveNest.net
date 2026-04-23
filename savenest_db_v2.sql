-- SaveNest v2
-- Version d'exemple basée sur la BDD actuelle, sans modifier le fichier `savenest_db.sql`
-- Objectif :
-- 1) un favori appartient a une seule categorie
-- 2) une categorie peut contenir 0 a plusieurs favoris
-- 3) une categorie peut etre partagee a d'autres utilisateurs
-- 4) la base porte un autre nom pour ne pas ecraser la base actuelle

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP DATABASE IF EXISTS `savenest_db_v2`;
CREATE DATABASE `savenest_db_v2` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `savenest_db_v2`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `language_` (
  `id_language` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `language_name` VARCHAR(50) NOT NULL,
  `language_icon` VARCHAR(10) DEFAULT NULL,
  PRIMARY KEY (`id_language`),
  UNIQUE KEY `uk_language_name` (`language_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id_role` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_code` VARCHAR(50) NOT NULL,
  `role_label` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_role`),
  UNIQUE KEY `uk_role_code` (`role_code`),
  UNIQUE KEY `uk_role_label` (`role_label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `savenest` (
  `id_savenest` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `date_inscription` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_savenest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_` (
  `id_user` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pseudo` VARCHAR(50) NOT NULL,
  `mail` VARCHAR(150) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `id_savenest` INT UNSIGNED NOT NULL,
  `id_role` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `uk_user_pseudo` (`pseudo`),
  UNIQUE KEY `uk_user_mail` (`mail`),
  KEY `idx_user_savenest` (`id_savenest`),
  KEY `idx_user_role` (`id_role`),
  CONSTRAINT `fk_user_savenest`
    FOREIGN KEY (`id_savenest`) REFERENCES `savenest` (`id_savenest`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role`
    FOREIGN KEY (`id_role`) REFERENCES `roles` (`id_role`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `id_user` represente ici le proprietaire de la categorie
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

-- Un favori appartient a une seule categorie via `id_category`
CREATE TABLE `favs` (
  `id_favs` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title_favs` VARCHAR(150) NOT NULL,
  `url_favs` VARCHAR(500) DEFAULT NULL,
  `added_date` DATE DEFAULT NULL,
  `logo` VARCHAR(150) DEFAULT NULL,
  `id_category` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_favs`),
  KEY `idx_favs_category` (`id_category`),
  CONSTRAINT `fk_favs_category`
    FOREIGN KEY (`id_category`) REFERENCES `category` (`id_category`)
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

-- Table de partage :
-- le proprietaire reste dans `category.id_user`
-- ici on stocke les autres utilisateurs ayant acces a la categorie
CREATE TABLE `category_shares` (
  `id_category` INT UNSIGNED NOT NULL,
  `id_user` INT UNSIGNED NOT NULL,
  `access_level` ENUM('VIEWER', 'EDITOR') NOT NULL DEFAULT 'VIEWER',
  `shared_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_category`, `id_user`),
  KEY `idx_category_shares_user` (`id_user`),
  CONSTRAINT `fk_category_shares_category`
    FOREIGN KEY (`id_category`) REFERENCES `category` (`id_category`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_category_shares_user`
    FOREIGN KEY (`id_user`) REFERENCES `user_` (`id_user`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `language_` (`id_language`, `language_name`, `language_icon`) VALUES
(1, 'French', 'FR'),
(2, 'English', 'EN'),
(3, 'Spanish', 'ES'),
(4, 'German', 'DE'),
(5, 'Japanese', 'JA');

INSERT INTO `roles` (`id_role`, `role_code`, `role_label`) VALUES
(1, 'ADMIN', 'Administrateur'),
(2, 'USER', 'Utilisateur'),
(3, 'MODERATOR', 'Moderateur');

INSERT INTO `savenest` (`id_savenest`, `date_inscription`) VALUES
(1, '2026-02-20 14:08:47'),
(2, '2026-02-20 14:08:47'),
(3, '2026-02-20 14:08:47');

INSERT INTO `user_` (`id_user`, `pseudo`, `mail`, `password`, `id_savenest`, `id_role`) VALUES
(1, 'Neo', 'neo@savenest.test', '$2b$10$uWMn2/qzNcOeHLD3fFV1CeNEuyx.mc/r0gt7zrdBihizIawvUYhdO', 1, 2),
(2, 'Trinity', 'trinity@savenest.test', '$2b$10$p0Ntcti9sdnsMVuzx.BU..K0sO/YBg2NMzCf1c5g7VRiR2RU/FQA6', 2, 2),
(3, 'Morpheus', 'morpheus@savenest.test', '$2b$10$twEypXVASciOVr48vCydDOCygCxrLEmHad.lVWeJDU5BH15W/bTla', 3, 1);

INSERT INTO `category` (`id_category`, `category_name`, `confidentiality`, `password`, `id_user`) VALUES
(1, 'Streaming', 0, NULL, 1),
(2, 'Gaming', 0, NULL, 1),
(3, 'Lectures', 1, 'Test123', 1),
(4, 'Movies To Watch', 0, NULL, 1),
(5, 'Youtube for Later', 1, 'Test123', 1);

-- Les favoris sont maintenant directement relies a leur categorie
INSERT INTO `favs` (`id_favs`, `title_favs`, `url_favs`, `added_date`, `logo`, `id_category`) VALUES
(1, 'My Canal', 'https://www.canalplus.com/', '2024-03-15', NULL, 1),
(2, 'Disney Plus', 'https://www.disneyplus.com/fr-fr/home', '2024-03-15', NULL, 1),
(3, 'Netflix', 'https://www.netflix.com/browse', '2024-03-15', NULL, 1),
(4, 'Amazon Prime Video', 'https://www.primevideo.com/storefront/home/ref=atv_nb_sf_hm', '2024-03-15', NULL, 1),
(5, 'ADN', 'https://animationdigitalnetwork.fr/', '2024-03-15', NULL, 1),
(6, 'Movix', 'https://movix.club/', NULL, NULL, 1),
(7, 'Voir Anime', 'https://voiranime.com/', NULL, NULL, 1),
(8, 'Elden Ring Wiki', 'https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki', NULL, NULL, 2),
(9, 'Boss Help Elden Ring', 'https://eldenring.wiki.fextralife.com/file/Elden-Ring/bosses_stats_map_elden_ring_wiki_guide_1584px.jpg?v=1647964271725', NULL, NULL, 2),
(10, 'Boss Help Elden Ring lvl recommandation', 'https://www.spieltimes.io/news/elden-ring-all-bosses-recommended-levels-and-location/', NULL, NULL, 2),
(11, 'Black Bow Build Elden Ring', 'https://www.reddit.com/r/Eldenring/comments/t83jcy/guide_bow_tips_and_tricks_after_completing_my', NULL, NULL, 2),
(12, 'PokedDex Tracker Living Dex', 'https://pokedextracker.com/u/MTJL/living-dex', NULL, NULL, 2),
(13, 'Line ups Valo', 'https://strats.gg/game/valorant/lineups', NULL, NULL, 2),
(14, 'Cyberpunk Netrunner build', 'https://gamestegy.com/post/cyberpunk-2077/698/netrunner-build#mcetoc_1fv422e9d7', NULL, NULL, 2),
(15, 'LOR POC Spreadsheet', 'https://docs.google.com/spreadsheets/u/0/d/1FePMz4o3tbiWcz0nHZYu0aAHknbIfb9anWfQCVtvtKk/htmlview#', NULL, NULL, 2),
(16, 'LOR POC XP Spreadsheet', 'https://docs.google.com/spreadsheets/d/1tmcROrNKN4dAPnmckIaSd-lRVz4UuJMSYpg_PRaZRN8/edit#gid=927209007', NULL, NULL, 2),
(17, 'BG 3 Beast Master Ranger Build', 'https://fextralife.com/baldurs-gate-3-beast-master-ranger-build-guide/', NULL, NULL, 2),
(18, 'LOL Graph', 'https://lolalytics.com/lol/tierlist/?view=tier', NULL, NULL, 2),
(19, 'Scan LELMANGA', 'https://www.lelmanga.com/', NULL, NULL, 3),
(20, 'One Piece : 1137', NULL, NULL, NULL, 3),
(21, 'Ippo : 1376', NULL, NULL, NULL, 3),
(22, 'Kingdom : 702', NULL, NULL, NULL, 3),
(23, 'One Punch Man : 218', NULL, NULL, NULL, 3),
(24, 'Quinn Fanfiction', 'https://www.reddit.com/r/collectionoferrors/comments/so9idk/the_tales_we_tell_chapter_0_prologue/', NULL, NULL, 3);

INSERT INTO `speaking` (`id_user`, `id_language`) VALUES
(1, 1),
(1, 2),
(1, 5),
(2, 2),
(2, 3),
(3, 1),
(3, 2),
(3, 4);

-- Exemples de partage :
-- category 1 partagee a Trinity en lecture
-- category 2 partagee a Morpheus en edition
-- category 4 partagee a Trinity en edition, meme si elle ne contient encore aucun favori
INSERT INTO `category_shares` (`id_category`, `id_user`, `access_level`, `shared_at`) VALUES
(1, 2, 'VIEWER', '2026-02-21 10:00:00'),
(2, 3, 'EDITOR', '2026-02-21 10:05:00'),
(4, 2, 'EDITOR', '2026-02-21 10:10:00');

ALTER TABLE `language_` AUTO_INCREMENT = 6;
ALTER TABLE `roles` AUTO_INCREMENT = 4;
ALTER TABLE `savenest` AUTO_INCREMENT = 4;
ALTER TABLE `user_` AUTO_INCREMENT = 4;
ALTER TABLE `category` AUTO_INCREMENT = 6;
ALTER TABLE `favs` AUTO_INCREMENT = 25;
