CREATE TABLE `socialPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`topic` varchar(255) NOT NULL,
	`tone` enum('professional','casual','punchy') NOT NULL,
	`copy` text NOT NULL,
	`hashtags` varchar(500),
	`platform` enum('LinkedIn','X','Instagram') NOT NULL DEFAULT 'LinkedIn',
	`status` enum('draft','approved','rejected','scheduled','posted') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `socialPosts_id` PRIMARY KEY(`id`)
);
