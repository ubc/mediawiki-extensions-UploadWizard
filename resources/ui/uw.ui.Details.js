/*
 * This file is part of the MediaWiki extension UploadWizard.
 *
 * UploadWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * UploadWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with UploadWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( mw, $, uw, OO ) {
	/**
	 * Represents the UI for the wizard's Details step.
	 *
	 * @class uw.ui.Details
	 * @extends uw.ui.Step
	 * @constructor
	 */
	uw.ui.Details = function UWUIDetails() {
		var details = this;

		function startDetails() {
			details.emit( 'start-details' );
		}

		uw.ui.Step.call(
			this,
			'details'
		);

		this.$div.prepend(
			$( '<div>' )
				.attr( 'id', 'mwe-upwiz-macro-files' )
				.addClass( 'mwe-upwiz-filled-filelist ui-corner-all' )
		);

		this.$errorCount = $( '<div>' )
			.attr( 'id', 'mwe-upwiz-details-error-count' );
		this.$buttons.append( this.$errorCount );

		this.nextButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-next-details' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', startDetails );

		this.$buttons.append(
			$( '<div>' ).addClass( 'mwe-upwiz-start-next mwe-upwiz-file-endchoice' ).append( this.nextButton.$element )
		);

		this.nextButtonDespiteFailures = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-next-file-despite-failures' ).text(),
			flags: [ 'progressive' ]
		} ).on( 'click', function () {
			details.emit( 'finalize-details-after-removal' );
		} );

		this.retryButtonSomeFailed = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-file-retry' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', startDetails );

		this.$buttons.append(
			$( '<div>' )
				.addClass( 'mwe-upwiz-file-next-some-failed mwe-upwiz-file-endchoice' )
				.append(
					new OO.ui.HorizontalLayout( {
						items: [
							new OO.ui.LabelWidget( {
								label: mw.message( 'mwe-upwiz-file-some-failed' ).text()
							} ),
							this.nextButtonDespiteFailures,
							this.retryButtonSomeFailed
						]
					} ).$element
				)
		);

		this.retryButtonAllFailed = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-file-retry' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', startDetails );

		this.$buttons.append(
			$( '<div>' )
				.addClass( 'mwe-upwiz-file-next-all-failed mwe-upwiz-file-endchoice' )
				.append(
					new OO.ui.HorizontalLayout( {
						items: [
							new OO.ui.LabelWidget( {
								label: mw.message( 'mwe-upwiz-file-all-failed' ).text()
							} ),
							this.retryButtonAllFailed
						]
					} ).$element
				)
		);
	};

	OO.inheritClass( uw.ui.Details, uw.ui.Step );

	/**
	 * Empty out all upload information.
	 */
	uw.ui.Details.prototype.empty = function () {
		// reset buttons on the details page
		this.$div.find( '.mwe-upwiz-file-next-some-failed' ).hide();
		this.$div.find( '.mwe-upwiz-file-next-all-failed' ).hide();
		this.$div.find( '.mwe-upwiz-start-next' ).show();
	};

	/**
	 * Hide buttons for moving to the next step.
	 */
	uw.ui.Details.prototype.hideEndButtons = function () {
		this.$errorCount.empty();
		this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-file-endchoice' )
			.hide();
	};

	/**
	 * Disable edits to the details.
	 */
	uw.ui.Details.prototype.disableEdits = function () {
		this.$div
			.find( '.mwe-upwiz-data' )
			.morphCrossfade( '.mwe-upwiz-submitting' );
	};

	/**
	 * Show errors in the form.
	 * The details page can be vertically long so sometimes it is not obvious there are errors above. This counts them and puts the count
	 * right next to the submit button, so it should be obvious to the user they need to fix things.
	 * This is a bit of a hack. We should already know how many errors there are, and where.
	 * This method also opens up "more info" if the form has errors.
	 */
	uw.ui.Details.prototype.showErrors = function () {
		var $errorElements = this.$div
				// TODO Evil
				.find( '.oo-ui-fieldLayout-messages-error' ),
			errorCount = $errorElements.length;

		// Open "more info" if that part of the form has errors
		$errorElements.each( function () {
			var moreInfo;
			if ( $( this ).parents( '.mwe-more-details' ).length === 1 ) {
				moreInfo = $( this ).parents( '.detailsForm' ).find( '.mwe-upwiz-details-more-options a' );
				if ( !moreInfo.hasClass( 'mwe-upwiz-toggler-open' ) ) {
					moreInfo.click();
				}
			}
		} );

		if ( errorCount > 0 ) {
			this.$errorCount
				.msg( 'mwe-upwiz-details-error-count', errorCount, this.uploads.length )
				// TODO The IconWidget and 'warning' flag is specific to MediaWiki theme, looks weird in Apex
				.prepend( new OO.ui.IconWidget( { icon: 'alert', flags: [ 'warning' ] } ).$element, ' ' );
			// Scroll to the first error
			$( 'html, body' ).animate( { scrollTop: $( $errorElements[ 0 ] ).offset().top - 50 }, 'slow' );
		} else {
			this.$errorCount.empty();
		}
	};

}( mediaWiki, jQuery, mediaWiki.uploadWizard, OO ) );
