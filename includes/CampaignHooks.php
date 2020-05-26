<?php
/**
 * Hooks for managing JSON Schema namespace and content model.
 *
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

class CampaignHooks {

	/**
	 * 'Campaign' content model must be used in, and only in, the 'Campaign' namespace.
	 *
	 * @param string $contentModel
	 * @param Title $title
	 * @param bool &$ok
	 * @return bool
	 */
	public static function onContentModelCanBeUsedOn( $contentModel, Title $title, &$ok ) {
		$isCampaignModel = $contentModel === 'Campaign';
		$isCampaignNamespace = $title->inNamespace( NS_CAMPAIGN );
		if ( $isCampaignModel !== $isCampaignNamespace ) {
			$ok = false;
			return false;
		}
		return true;
	}

	/**
	 * FIXME: This should be done as a DataUpdate
	 *
	 * Sets up appropriate entries in the uc_campaigns table for each Campaign
	 * Acts everytime a page in the NS_CAMPAIGN namespace is saved
	 *
	 * @param WikiPage $wikiPage
	 * @param User $user
	 * @param Content $content
	 * @param string $summary
	 * @param bool $isMinor
	 * @param bool $isWatch
	 * @param string $section
	 * @param int $flags
	 * @param Revision $revision
	 * @param Status $status
	 * @param int $baseRevId
	 *
	 * @return bool
	 */
	public static function onPageContentSaveComplete(
		WikiPage $wikiPage, $user, $content, $summary, $isMinor, $isWatch,
		$section, $flags, $revision, $status, $baseRevId
	) {
		if ( !$content instanceof CampaignContent ) {
			return true;
		}

		$dbw = wfGetDB( DB_MASTER );

		$campaignData = $content->getJsonData();
		$insertData = [
			'campaign_enabled' => $campaignData !== null && $campaignData['enabled'] ? 1 : 0
		];
		$success = $dbw->upsert(
			'uw_campaigns',
			array_merge(
				[ 'campaign_name' => $wikiPage->getTitle()->getDBkey() ],
				$insertData
			),
			'campaign_name',
			$insertData
		);

		$campaign = new UploadWizardCampaign( $wikiPage->getTitle(), $content->getJsonData() );
		$dbw->onTransactionPreCommitOrIdle( function () use ( $campaign ) {
			$campaign->invalidateCache();
		} );

		return $success;
	}

	/**
	 * Invalidates the cache for a campaign when any of its dependents are edited. The 'dependents'
	 * are tracked by entries in the templatelinks table, which are inserted by using the
	 * PageContentSaveComplete hook.
	 *
	 * This is usually run via the Job Queue mechanism.
	 * @param LinksUpdate &$linksupdate
	 * @return bool
	 */
	public static function onLinksUpdateComplete( LinksUpdate &$linksupdate ) {
		if ( !$linksupdate->getTitle()->inNamespace( NS_CAMPAIGN ) ) {
			return true;
		}

		$campaign = new UploadWizardCampaign( $linksupdate->getTitle() );
		$campaign->invalidateCache();

		return true;
	}

	/**
	 * Deletes entries from uc_campaigns table when a Campaign is deleted
	 * @param Article $article
	 * @param User $user
	 * @param string $reason
	 * @param int $id
	 * @param Content $content
	 * @param ManualLogEntry $logEntry
	 * @return bool
	 */
	public static function onArticleDeleteComplete(
		$article, $user, $reason, $id, $content, $logEntry
	) {
		if ( !$article->getTitle()->inNamespace( NS_CAMPAIGN ) ) {
			return true;
		}

		$dbw = wfGetDB( DB_MASTER );
		$dbw->onTransactionPreCommitOrIdle( function () use ( $dbw, $article ) {
			$dbw->delete(
				'uw_campaigns',
				[ 'campaign_name' => $article->getTitle()->getDBkey() ]
			);
		} );

		return true;
	}

	/**
	 * Update campaign names when the Campaign page moves
	 * @param Title $oldTitle
	 * @param Title $newTitle
	 * @param User $user
	 * @param int $pageid
	 * @param int $redirid
	 * @return bool
	 */
	public static function onTitleMoveComplete(
		Title $oldTitle, Title $newTitle, $user, $pageid, $redirid
	) {
		if ( !$oldTitle->inNamespace( NS_CAMPAIGN ) ) {
			return true;
		}

		$dbw = wfGetDB( DB_MASTER );
		$success = $dbw->update(
			'uw_campaigns',
			[ 'campaign_name' => $newTitle->getDBkey() ],
			[ 'campaign_name' => $oldTitle->getDBkey() ]
		);

		return $success;
	}

	/**
	 * Declares JSON as the code editor language for Campaign: pages.
	 * This hook only runs if the CodeEditor extension is enabled.
	 * @param Title $title
	 * @param string &$lang Page language.
	 * @return bool
	 */
	public static function onCodeEditorGetPageLanguage( $title, &$lang ) {
		if ( $title->inNamespace( NS_CAMPAIGN ) ) {
			$lang = 'json';
		}
		return true;
	}

	/**
	 * Validates that the revised contents are valid JSON.
	 * If not valid, rejects edit with error message.
	 * @param IContextSource $context
	 * @param Content $content
	 * @param Status $status
	 * @param string $summary
	 * @param User $user
	 * @param bool $minoredit
	 * @return true
	 */
	public static function onEditFilterMergedContent( $context, $content, $status, $summary,
		$user, $minoredit
	) {
		if ( !$context->getTitle()->inNamespace( NS_CAMPAIGN )
			|| !$content instanceof CampaignContent
		) {
			return true;
		}

		try {
			$content->validate();
		} catch ( JsonSchemaException $e ) {
			$status->fatal( $context->msg( $e->getCode(), $e->args ) );
		}

		return true;
	}
}
