/**
 * All user-facing legal and safety text in one place.
 *
 * Kept as a single source of truth so the wording shown in the app,
 * on first run, and in Settings can never drift apart from each other
 * — and so it can be reviewed by a solicitor as one file.
 *
 * NOTE: this is a reasonable starting point, not legal advice. Have it
 * reviewed before you publish, especially if you sell outside the UK.
 */

export const APP_NAME = 'SnapLarder';
export const CONTACT_EMAIL = 'support@snaplarder.com'; 
export const PRIVACY_URL = 'https://snaplarder.com/privacy.html'; 
export const TERMS_URL = 'https://snaplarder.com/terms.html'; 
export const LAST_UPDATED = 'September 2026';

/**
 * The single most important text in the app. Shown on first launch and
 * always available in Settings.
 *
 * The legal exposure here is real: Apple's Developer Agreement (§10)
 * makes you indemnify Apple against end-user claims, so if someone eats
 * something because the app implied it was safe, that lands on you.
 * The mitigation is to never imply the app knows whether food is safe.
 */
export const SAFETY_DISCLAIMER_SHORT =
  `${APP_NAME} gives reminders, not food safety advice. Always check food yourself before eating it.`;

export const SAFETY_DISCLAIMER_FULL = `${APP_NAME} is a reminder tool. It is not a food safety product and cannot tell you whether food is safe to eat.

Dates shown in the app come from two sources:

• Estimated dates are typical shelf-life figures for a category of food. They are general guidance only. They do not account for how the food was stored, transported, handled, or how fresh it was when you bought it.

• Label dates are read from packaging using text recognition. This can misread, and packaging can be damaged, faded or embossed in ways that cannot be read reliably.

Either type of date may be wrong.

Always use your own judgement. Check the packaging, and look, smell and inspect food before eating it. If in doubt, throw it out.

Do not rely on ${APP_NAME} for decisions about food safety, allergens, medication, infant feeding, or where you have a medical condition affected by diet. ${APP_NAME} is not a substitute for official food safety guidance from your local authority or the Food Standards Agency.

${APP_NAME} is provided "as is" without warranty. To the fullest extent permitted by law, the developer is not liable for any illness, loss or damage arising from reliance on the app. Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be excluded.`;

export const PRIVACY_POLICY = `PRIVACY POLICY — ${APP_NAME}
Last updated: ${LAST_UPDATED}

SUMMARY

${APP_NAME} keeps your food data on your phone. There is no account, and the developer never receives your items, photos or usage.

Two features do contact outside services, and both are described below: barcode lookup, and processing your purchase. Neither sends anything that identifies you personally.

WHAT THE APP STORES

• The food items you add, their categories, dates and whether you have used them.
• Your settings, such as notification timing and date region.
• Whether you have purchased the unlock.

All of this is stored locally on your device. The developer cannot see it and has no access to it.

PHOTOS AND CAMERA

If you use the scanning feature, ${APP_NAME} accesses your camera to take a photo. Text recognition happens entirely on your device. Photos are used only to read the text and are not stored by the app, not uploaded, and not shared with the developer or anyone else.

The app does not access your photo library.

BARCODE SCANNING

If you scan a barcode, ${APP_NAME} sends the barcode number to Open Food Facts (openfoodfacts.org), a free, open database of food products, in order to look up the product name, category and photograph.

Only the barcode number is sent. No account, device identifier, location or photo is included, and the request is not linked to you.

Open Food Facts receives your device's IP address as part of any internet request, as any website would. Their handling of that is covered by their own privacy policy at openfoodfacts.org.

Results are cached on your device, so the same product is only ever looked up once.

If a product has a photograph in that database, the image is downloaded and stored on your phone alongside the item. If you never scan a barcode, nothing is ever sent.

NOTIFICATIONS

Expiry reminders are scheduled locally on your device. No notification data leaves your phone. You can turn notifications off at any time in your iPhone Settings.

PURCHASES

The one-time unlock is processed by Apple. The developer never sees your payment details.

${APP_NAME} uses RevenueCat (revenuecat.com) to check whether you have purchased the unlock, and to restore it if you reinstall or change device. RevenueCat receives an anonymous identifier generated for your installation, your IP address, device model, operating system version, and the fact that a purchase was or was not made.

This identifier is not your name, email or Apple ID, and is not linked to your food items, photos or anything else in the app. RevenueCat's handling of it is covered by their privacy policy at revenuecat.com/privacy.

Apple's handling of your purchase is covered by Apple's own privacy policy.

ANALYTICS AND ADVERTISING

${APP_NAME} contains no advertising, no behavioural tracking, and no cross-app or cross-site tracking. Nothing you do in the app is used to build a profile of you or shown to advertisers.

The app does include one third-party component, RevenueCat, described under PURCHASES above. It exists solely to manage your unlock, and the data it receives is limited to what is needed for that.

CHILDREN

${APP_NAME} is not directed at children under 13 and does not knowingly collect data from them. Since no data is collected at all, this is largely moot.

YOUR RIGHTS

Your food items, photos, dates and settings never leave your device. Deleting the app deletes all of them, and there is nothing for the developer to hand over, correct or erase, because the developer never receives them.

For the limited data described under BARCODE SCANNING and PURCHASES, the recipients are Open Food Facts and RevenueCat respectively. If you want that data removed, contact ${CONTACT_EMAIL} and the developer will pass the request on.

Under UK GDPR you have rights of access, rectification and erasure. As no personal data is processed by the developer, these are satisfied by the local-only design.

CHANGES

If this policy changes, the updated version will be published at ${PRIVACY_URL} and in the app.

CONTACT

${CONTACT_EMAIL}`;

export const TERMS_OF_USE = `TERMS OF USE — ${APP_NAME}
Last updated: ${LAST_UPDATED}

1. ACCEPTANCE

By using ${APP_NAME} you agree to these terms. If you do not agree, do not use the app.

2. WHAT THE APP IS

${APP_NAME} is a reminder tool that helps you keep track of food you own and prompts you before it is likely to go off. It is not a food safety product, a nutrition service, or medical advice.

3. NO FOOD SAFETY GUARANTEE

Dates in the app are estimates or are read from packaging by text recognition. Both can be wrong. You must use your own judgement and inspect food before eating it. See the in-app Food Safety Notice, which forms part of these terms.

4. PURCHASES

The unlock is a one-time purchase that removes the limit on how many items you can track. It is not a subscription and does not renew. Purchases are handled by Apple and are subject to Apple's terms. Refunds are handled by Apple, not by the developer.

If you reinstall the app or change device, you can restore your purchase free of charge using the Restore Purchase option. Your tracked items are stored only on your device and do not transfer between devices.

5. AVAILABILITY

The app is provided as is. Features may change and the app may be withdrawn or stop working with future versions of iOS.

6. LIABILITY

To the fullest extent permitted by law, the developer is not liable for any loss or damage arising from your use of, or inability to use, ${APP_NAME}, including any illness or loss arising from reliance on dates shown in the app.

Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any liability that cannot lawfully be excluded or limited.

If you are a consumer, these terms do not affect your statutory rights.

7. GOVERNING LAW

These terms are governed by the laws of England and Wales.

8. CONTACT

${CONTACT_EMAIL}`;
