/**
 * Usability properties — things that make the app feel considered, or
 * fail to.
 *
 * None of these are crashes. They're the errors that make someone think
 * nobody read the app back before shipping it, which on a food-dates app
 * is expensive: the whole proposition is "this pays attention to detail
 * so you don't have to".
 *
 * Three of these found live faults.
 */

import { describe, it, expect } from './runner.mjs';
import { loadModule } from './loader.mjs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { countOf, daysPhrase, checkItPhrase } = await loadModule('services/phrasing.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

async function jsFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await jsFiles(full)));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const sources = new Map();
for (const f of await jsFiles(SRC)) {
  sources.set(path.relative(SRC, f).split(path.sep).join('/'), await readFile(f, 'utf8'));
}
const ui = [...sources.entries()].filter(
  ([n]) => n.startsWith('components/') || n.startsWith('screens/')
);

/* ------------------------------------------------------------------ */

describe('Counting things in English', () => {
  // Found live: "check it in 1 days", "in 1 days", "1 days ago" — in
  // three separate files, because `${days} days` is the obvious thing to
  // type and nothing complains.

  it('one day is singular', () => {
    expect(countOf(1, 'day')).toBe('1 day');
  });

  it('two days are plural', () => {
    expect(countOf(2, 'day')).toBe('2 days');
  });

  it('zero is plural', () => {
    expect(countOf(0, 'day')).toBe('0 days');
  });

  it('minus one is singular', () => {
    expect(countOf(-1, 'day')).toBe('-1 day');
  });

  it('irregular plurals can be given', () => {
    expect(countOf(1, 'is', 'are')).toBe('1 is');
    expect(countOf(3, 'is', 'are')).toBe('3 are');
  });

  it('copes with nonsense', () => {
    expect(countOf(undefined, 'day')).toBe('days');
  });
});

describe('Describing when something expires', () => {
  it('today is named, not counted', () => {
    // "in 0 days" is technically right and reads like a robot.
    expect(daysPhrase(0)).toBe('today');
  });

  it('tomorrow is singular', () => {
    expect(daysPhrase(1)).toBe('in 1 day');
  });

  it('yesterday is singular', () => {
    expect(daysPhrase(-1)).toBe('1 day ago');
  });

  it('a week is plural both ways', () => {
    expect(daysPhrase(7)).toBe('in 7 days');
    expect(daysPhrase(-7)).toBe('7 days ago');
  });

  it('the use-it-up prompt says today rather than in 0 days', () => {
    expect(checkItPhrase(0)).toBe('check it today');
  });

  it('and is singular at one', () => {
    expect(checkItPhrase(1)).toBe('check it in 1 day');
  });

  it('never counts backwards in the prompt', () => {
    // An expired item should say "today", not "in -3 days".
    expect(checkItPhrase(-3)).toBe('check it today');
  });
});

describe('No screen counts days by hand', () => {
  it('nothing rebuilds the pluralisation inline', () => {
    // The regression guard. Three files each had their own version.
    const offenders = ui
      .filter(([, src]) => /day\$\{[^}]*===\s*1/.test(src))
      .map(([name]) => name);
    if (offenders.length) {
      throw new Error(`inline pluralisation in: ${offenders.join(', ')}`);
    }
    expect(offenders.length).toBe(0);
  });

  it('no bare "${n} days" template survives', () => {
    const offenders = ui
      .filter(([, src]) => /\$\{[^}]*days?\}\s+days\b/.test(src))
      .map(([name]) => name);
    expect(offenders.length).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

describe('Every way out is a way out', () => {
  const modals = ui.filter(([, src]) => src.includes('<Modal'));

  it('found the modal screens', () => {
    expect(modals.length).toBeGreaterThan(2);
  });

  it('every modal offers a way to leave', () => {
    // A modal with no dismiss traps someone in it. The safety
    // disclaimer is the deliberate exception — it's a gate, and it has
    // an accept button rather than a close.
    const trapped = modals
      .filter(([name, src]) => {
        if (name.includes('SafetyDisclaimer')) return false;
        return !/onClose|onCancel|onRequestClose/.test(src);
      })
      .map(([name]) => name);
    if (trapped.length) {
      throw new Error(`no way out of: ${trapped.join(', ')}`);
    }
    expect(trapped.length).toBe(0);
  });

  it('the safety gate has an action, even though it has no close', () => {
    const src = sources.get('components/SafetyDisclaimer.js');
    expect(/<Pressable/.test(src)).toBe(true);
  });
});

describe('Destructive actions ask first', () => {
  it('deleting one item does NOT confirm — it offers undo instead', () => {
    // Changed deliberately. A prompt on every swipe taxes the common
    // case; undo taxes only the mistake. Kept as a test so the prompt
    // doesn't quietly reappear in a later refactor.
    const pantry = sources.get('screens/PantryScreen.js');
    expect(/Alert\.alert\([\s\S]{0,80}Delete item\?/.test(pantry)).toBe(false);
    expect(/pendingRemoval/.test(pantry)).toBe(true);
  });

  it('clearing every expired item confirms', () => {
    const pantry = sources.get('screens/PantryScreen.js');
    expect(/Clear expired\?/.test(pantry)).toBe(true);
  });

  it('deleting from the item sheet confirms', () => {
    const detail = sources.get('components/ItemDetail.js');
    expect(/Alert\.alert\(/.test(detail)).toBe(true);
  });

  it('bulk clearing still confirms, because undo cannot cover it', () => {
    // One swipe is one item and one undo. "Clear all" can remove
    // sixteen at once, which no single undo bar sensibly restores — so
    // that one keeps its prompt.
    const pantry = sources.get('screens/PantryScreen.js');
    expect(/Clear expired\?/.test(pantry)).toBe(true);
  });

  it('every destructive button is styled as destructive', () => {
    // iOS users read red as "this one is different". A delete that
    // looks like a cancel gets tapped by accident.
    const pantry = sources.get('screens/PantryScreen.js');
    const alerts = pantry.match(/Alert\.alert\([\s\S]*?\]\s*\)/g) ?? [];
    for (const block of alerts) {
      if (/Delete|Clear/.test(block)) {
        expect(/style:\s*'destructive'/.test(block)).toBe(true);
      }
    }
  });
});

describe('The app never claims food is safe', () => {
  // The whole legal position rests on this. Every mention in the code
  // should be a denial, never an assurance.
  it('every mention of safety is a denial, never an assurance', () => {
    // Checked by looking for a negation near each mention rather than
    // against a list of approved sentences — my first version whitelisted
    // three phrasings and flagged a fourth perfectly good one, which is
    // how a test starts nagging about correct code and gets deleted.
    const NEGATED = /\b(not|cannot|can't|never|isn't|whether|no)\b/i;
    const offenders = [];

    for (const [name, src] of sources) {
      for (const m of src.matchAll(/safe\s+to\s+eat/gi)) {
        const before = src.slice(Math.max(0, m.index - 120), m.index);
        if (!NEGATED.test(before)) offenders.push(`${name} @ ${m.index}`);
      }
    }

    if (offenders.length) {
      throw new Error(`unqualified safety claim: ${offenders.join(', ')}`);
    }
    expect(offenders.length).toBe(0);
  });

  it('the check can tell an assurance from a denial', () => {
    // Guards the guard: a negation search that matched everything would
    // pass silently forever.
    const NEGATED = /\b(not|cannot|can't|never|isn't|whether|no)\b/i;
    expect(NEGATED.test('It cannot tell you whether food is ')).toBe(true);
    expect(NEGATED.test('This tells you your food is ')).toBe(false);
  });

  it('the disclaimer states the limit plainly', () => {
    const legal = sources.get('services/legal.js');
    expect(/cannot tell you whether food is safe to eat/.test(legal)).toBe(true);
  });

  it('dates are labelled as estimates where they are estimates', () => {
    const card = sources.get('components/ItemCard.js');
    expect(card.includes('EST.')).toBe(true);
  });
});

describe('Waiting is always visible', () => {
  // Silence after a tap reads as a broken button, and the reflex is to
  // tap again — which on a purchase is the worst possible moment.
  const pending = [
    ['screens/SettingsScreen.js', 'buying'],
    ['screens/SettingsScreen.js', 'restoring'],
    ['screens/SettingsScreen.js', 'rescheduling'],
    ['screens/AddItemScreen.js', 'scanning'],
    ['screens/AddItemScreen.js', 'lookingUp'],
    ['components/ItemDetail.js', 'togglingReminder'],
  ];

  for (const [file, flag] of pending) {
    it(`${file.split('/').pop()} tracks "${flag}"`, () => {
      expect(sources.get(file).includes(flag)).toBe(true);
    });
  }

  it('the purchase button cannot be double-tapped', () => {
    const settings = sources.get('screens/SettingsScreen.js');
    expect(/if \(buying\) return;/.test(settings)).toBe(true);
  });

  it('nor can restore', () => {
    const settings = sources.get('screens/SettingsScreen.js');
    expect(/if \(restoring\) return;/.test(settings)).toBe(true);
  });
});

/**
 * The test override must not swallow a real purchase.
 *
 * Reported as "Unlock for $1.99 didn't do anything". It did: the
 * purchase completed and `hasUnlocked` went true. But the value the
 * interface reads is
 *
 *     hasUnlocked && !pretendNotPurchased
 *
 * so with the override on, a completed purchase was indistinguishable
 * from a dead button — no error, no change, nothing.
 *
 * A debugging aid that hides the thing you're debugging is worse than
 * no aid at all.
 */
describe('Buying while pretending not to have bought', () => {
  const purchase = sources.get('services/PurchaseContext.js');

  it('a purchase under the override is recorded, not hidden', () => {
    // It used to lift the override automatically. That fixed the
    // "nothing happened" confusion and created a worse one: against a
    // sandbox account the purchase always succeeds instantly, so every
    // look at the paywall silently switched testing off again.
    expect(/if \(owned\) notePurchaseUnderOverride\(\);/.test(purchase)).toBe(true);
  });

  it('restore records it too', () => {
    const occurrences = (purchase.match(/notePurchaseUnderOverride\(\);/g) ?? []).length;
    expect(occurrences).toBeGreaterThan(2);
  });

  it('the override is never changed behind the tester', () => {
    // The setting belongs to whoever turned it on.
    expect(/liftOverride/.test(purchase)).toBe(false);
  });

  it('and the paywall says a purchase completed under it', () => {
    const paywall = sources.get('components/Paywall.js');
    expect(/purchasedWhileOverridden/.test(paywall)).toBe(true);
  });

  it('offering a one-tap way to see the unlocked state', () => {
    const paywall = sources.get('components/Paywall.js');
    expect(/togglePretendNotPurchased\(false\)/.test(paywall)).toBe(true);
  });

  it('the override still cannot grant access on its own', () => {
    // It may only ever remove, never add.
    expect(
      /hasUnlocked && !\(SHOW_TEST_CONTROLS && pretendNotPurchased\)/.test(purchase)
    ).toBe(true);
  });

  it('the paywall says when the override is in force', () => {
    // So a suppressed purchase can never again look like a dead button.
    const paywall = sources.get('components/Paywall.js');
    expect(/pretendNotPurchased && \(/.test(paywall)).toBe(true);
  });
});

/**
 * Deleting without a prompt.
 *
 * The confirmation went because it taxed the common case — someone
 * swiping a row knows what they meant. But deletion still erases the
 * record of something wasted, so it can't be silently irreversible
 * either. Undo taxes only the mistake.
 */
describe('Deleting is immediate but recoverable', () => {
  const context = sources.get('services/PantryContext.js');
  const pantry = sources.get('screens/PantryScreen.js');

  it('the swipe no longer asks first', () => {
    expect(/onDelete=\{\(\) => removeItem\(item\)\}/.test(pantry)).toBe(true);
  });

  it('a deleted item can be brought back', () => {
    expect(/const undoRemove = useCallback/.test(context)).toBe(true);
  });

  it('the photo survives the undo window', () => {
    // Deleting the file immediately would make undo restore an item
    // with a broken thumbnail — the fix for the container-UUID bug,
    // undone by a different route.
    const removeBlock = context.slice(
      context.indexOf('const removeItem = useCallback'),
      context.indexOf('const undoRemove = useCallback')
    );
    const immediate = /deletePhoto\([^)]*\);(?![\s\S]*setTimeout)/.test(
      removeBlock.split('setTimeout')[0]
    );
    expect(immediate).toBe(false);
  });

  it('the photo is cleared once the window closes', () => {
    expect(/setTimeout\(\(\) => \{\s*deletePhoto/.test(context)).toBe(true);
  });

  it('a second deletion finalises the first', () => {
    // Otherwise two quick swipes leave an orphaned photo and an undo
    // bar pointing at the wrong item.
    expect(/commitPendingRemoval\(\);/.test(context)).toBe(true);
  });

  it('the restored item gets a new reminder rather than a dead id', () => {
    // The old notification was cancelled on the way out; its id refers
    // to nothing now.
    expect(/notificationId: await scheduleExpiryNudge\(pending\.item\)/.test(context)).toBe(true);
  });

  it('the undo control is reachable by screen reader', () => {
    expect(/accessibilityLabel=\{`Undo deleting/.test(pantry)).toBe(true);
  });
});

describe('Adding items still works', () => {
  const context = sources.get('services/PantryContext.js');

  it('addItem is still exported on the context', () => {
    expect(/\n\s*addItem,/.test(context)).toBe(true);
  });

  it('it still appends to the list', () => {
    expect(/setItems\(\(prev\) => \[\.\.\.prev, item\]\)/.test(context)).toBe(true);
  });

  it('it still counts the item immediately, not next render', () => {
    // The stale-count bug that let batch scans past the free limit.
    expect(/activeCountRef\.current \+= 1/.test(context)).toBe(true);
  });

  it('it still returns a result so batch callers can stop', () => {
    const addBlock = context.slice(
      context.indexOf('const addItem = useCallback'),
      context.indexOf('const addScannedItems')
    );
    expect(/return true;/.test(addBlock)).toBe(true);
    expect(/return false;/.test(addBlock)).toBe(true);
  });

  it('the pending deletion cannot block an add', () => {
    // removeItem gained state; addItem must not have gained a dependency
    // on it.
    const addBlock = context.slice(
      context.indexOf('const addItem = useCallback'),
      context.indexOf('const addScannedItems')
    );
    expect(/pendingRemoval|pendingRef/.test(addBlock)).toBe(false);
  });
});

/**
 * An unrecognised barcode must say so.
 *
 * Fifth silent failure in this project. The code read cleanly, the
 * lookup came back empty, and nothing appeared on screen — so it looked
 * exactly like a scanner that hadn't fired. Open Food Facts is
 * community-maintained and a long way from complete, so this is the
 * common case, not the edge one.
 */
describe('A barcode the database does not know', () => {
  const add = sources.get('screens/AddItemScreen.js');

  it('is reported rather than ignored', () => {
    expect(/setUnknownCode\(data\)/.test(add)).toBe(true);
  });

  it('shows the code, so the user can tell reading from knowing apart', () => {
    expect(/\{unknownCode\}/.test(add)).toBe(true);
  });

  it('offers a way forward rather than just an apology', () => {
    expect(/setMode\('manual'\)/.test(add)).toBe(true);
  });

  it('releases the code so a second attempt can work', () => {
    // The first read may simply have been blurred.
    expect(/sessionRef\.current\.release\(data\)/.test(add)).toBe(true);
  });

  it('clears once a scan finally succeeds', () => {
    expect(/setUnknownCode\(null\);\s*\n\s*setScanned/.test(add)).toBe(true);
  });
});

/**
 * Adding items must feel immediate.
 *
 * Reported as five to ten seconds between confirming a scan and the
 * items appearing. Three costs compounded, all of them per item, all of
 * them on a loop that adds one at a time:
 *
 *   a product image downloaded over the network, awaited
 *   three AsyncStorage reads for reminder preferences
 *   a full re-serialisation of the entire item list
 *
 * Ten items meant ten downloads back to back. The others were cheap
 * individually and not in aggregate.
 */
describe('Nothing slow sits on the add path', () => {
  const context = sources.get('services/PantryContext.js');
  const notifications = sources.get('services/notifications.js');

  const addBlock = context.slice(
    context.indexOf('const addItem = useCallback'),
    context.indexOf('const addScannedItems')
  );

  it('the product image is not awaited before the item exists', () => {
    // A thumbnail is decoration. The item, its date and its reminder
    // are the product.
    expect(/await savePhotoFromUrl/.test(addBlock)).toBe(false);
  });

  it('it is fetched afterwards and patched in', () => {
    expect(/savePhotoFromUrl\([^)]*\)\s*\.then/.test(addBlock)).toBe(true);
  });

  it('a failed download cannot reject the add', () => {
    expect(/\.catch\(\(\) => \{/.test(addBlock)).toBe(true);
  });

  it('a local photo copy is still inline, being a file move', () => {
    expect(/await savePhoto\(photoUri/.test(addBlock)).toBe(true);
  });

  it('reminder preferences are read from memory after the first time', () => {
    expect(/if \(prefs\.enabled !== null\) return prefs\.enabled;/.test(notifications)).toBe(true);
    expect(/if \(prefs\.days !== null\) return prefs\.days;/.test(notifications)).toBe(true);
    expect(/if \(prefs\.hour !== null\) return prefs\.hour;/.test(notifications)).toBe(true);
  });

  it('every setter writes through the cache', () => {
    // Otherwise the cache goes stale and the setting appears to do
    // nothing, which is worse than the slowness it replaced.
    expect(/prefs\.enabled = !!enabled;/.test(notifications)).toBe(true);
    expect(/prefs\.days = clamped;/.test(notifications)).toBe(true);
    expect(/prefs\.hour = clamped;/.test(notifications)).toBe(true);
  });

  it('nothing writes the days key behind the cache', () => {
    // SettingsScreen used to set it directly with AsyncStorage.
    const settings = sources.get('screens/SettingsScreen.js');
    expect(/AsyncStorage\.setItem\('nudgeDaysBefore'/.test(settings)).toBe(false);
  });

  it('the pantry is not rewritten on every single change', () => {
    expect(/setTimeout\(\(\) => \{\s*AsyncStorage\.setItem\(ITEMS_KEY/.test(context)).toBe(true);
  });

  it('but a pending write is always flushed', () => {
    // Coalescing that can drop the last change is a data-loss bug
    // wearing a performance costume.
    const persist = context.slice(
      context.indexOf('Persist the pantry, coalesced'),
      context.indexOf('}, [items, loaded]);')
    );
    expect(/return \(\) => \{[\s\S]*AsyncStorage\.setItem\(ITEMS_KEY/.test(persist)).toBe(true);
  });
});

/**
 * A tap must look like a tap.
 *
 * Reported as: it isn't clear a button has been pressed. Pressable
 * exposes a `pressed` flag, but a decisive tap is over in well under a
 * tenth of a second — the highlight can come and go inside one frame,
 * and the control reads as dead.
 *
 * Worst on controls whose effect isn't immediately visible. "Restart"
 * in the test section genuinely works, and with an unlocked account
 * nothing on screen moves, so it looked broken twice over.
 */
describe('Pressing something shows that it was pressed', () => {
  const flash = sources.get('components/PressFlash.js');

  it('the highlight outlives a very quick tap', () => {
    expect(/FLASH_MS/.test(flash)).toBe(true);
    expect(/setTimeout\(\(\) => setFlashing\(false\), remaining\)/.test(flash)).toBe(true);
  });

  it('it is long enough to see and short enough not to lag', () => {
    const ms = Number(/FLASH_MS = (\d+)/.exec(flash)?.[1]);
    expect(ms >= 80 && ms <= 250).toBe(true);
  });

  it('a disabled control does not flash', () => {
    // A highlight promises something is about to happen.
    expect(/flashing && !disabled/.test(flash)).toBe(true);
  });

  it('the highlight works on any background', () => {
    // These sit on cream, on dark green and on photographs, so a fixed
    // colour would be invisible somewhere.
    expect(/DEFAULT_FLASH = \{ opacity/.test(flash)).toBe(true);
  });

  const usingFlash = [
    'screens/SettingsScreen.js',
    'components/ItemDetail.js',
    'components/TrialNotice.js',
    'screens/PantryScreen.js',
  ];

  for (const file of usingFlash) {
    it(`${file.split('/').pop()} uses it`, () => {
      expect(/<PressFlash/.test(sources.get(file))).toBe(true);
    });
  }
});

describe('A test control says what it did', () => {
  const settings = sources.get('screens/SettingsScreen.js');

  it('restarting the trial reports the new state', () => {
    // It always worked. With an unlocked account nothing visible
    // changes, which is indistinguishable from a dead button.
    expect(/Trial restarted/.test(settings)).toBe(true);
  });

  it('and the other two do as well', () => {
    expect(/Trial set to 2 days left/.test(settings)).toBe(true);
    expect(/Trial ended — the free limit now applies/.test(settings)).toBe(true);
  });

  it('and it says when a purchase is masking the effect', () => {
    expect(/You own the unlock, so none of these will change/.test(settings)).toBe(true);
  });
});

/**
 * What the barcode found must be visible, not just influential.
 *
 * Reported as: calories ticked in settings, nothing on the detail
 * screen. Correct — the field had only been added to the list row. And
 * the wider point is right: everything the lookup returns is currently
 * used to set dates and locations behind the scenes, where the user
 * can't check any of it.
 *
 * The storage line matters most. Our reading of "Store in a cool dry
 * place. Refrigerate after opening." is an interpretation, and showing
 * the original sentence lets someone judge it rather than trust it.
 */
describe('The detail screen shows what the barcode found', () => {
  const detail = sources.get('components/ItemDetail.js');

  it('has a section for it', () => {
    // Headed "More information", not "From the barcode" — where a fact
    // came from is the app's business; what it says is the user's.
    expect(/MORE INFORMATION/.test(detail)).toBe(true);
  });

  it('shows the pack size', () => {
    expect(/item\.size &&/.test(detail)).toBe(true);
  });

  it('shows calories with their basis, not a bare number', () => {
    expect(/item\.calories\.label/.test(detail)).toBe(true);
  });

  it('shows the opened-within figure', () => {
    expect(/item\.openedDays != null/.test(detail)).toBe(true);
  });

  it('shows the storage sentence as printed', () => {
    expect(/item\.storageAdvice/.test(detail)).toBe(true);
  });

  it('shows the code itself', () => {
    expect(/item\.barcode &&/.test(detail)).toBe(true);
  });

  it('and the whole section is absent for a hand-typed item', () => {
    // Nothing known means no empty box.
    expect(/hasProductInfo &&/.test(detail)).toBe(true);
  });

  it('shows the brand', () => {
    expect(/item\.brand &&/.test(detail)).toBe(true);
  });

  it('shows the nutrition panel', () => {
    expect(/item\.nutrition\?\.length > 0/.test(detail)).toBe(true);
  });

  it('shows the ingredients as printed', () => {
    expect(/item\.ingredients &&/.test(detail)).toBe(true);
  });

  it('shows allergens with a caution, every time', () => {
    // This list comes from a database anyone can edit. An allergen list
    // quietly missing an entry is more dangerous than no list at all,
    // so the caveat is not optional and not a one-off dismissal.
    expect(/item\.allergens\?\.length > 0/.test(detail)).toBe(true);
    expect(/may be incomplete — always check the packet/.test(detail)).toBe(true);
  });

  it('the caution sits inside the allergen block, not elsewhere', () => {
    const block = detail.slice(detail.indexOf('ALLERGENS'), detail.indexOf('INGREDIENTS'));
    expect(/always check the packet/.test(block)).toBe(true);
  });
});

describe('Category is never shown as if it were a location', () => {
  it('the detail header does not print the raw category', () => {
    // "PANTRY" under the name, with the Fridge chip selected, is a
    // contradiction on its face — and it happens because one of the
    // four food categories is also the name of a location.
    const detail = sources.get('components/ItemDetail.js');
    expect(/<Text style=\{styles\.category\}>\{item\.category\}<\/Text>/.test(detail)).toBe(false);
  });
});

describe('The trial is visible on the Kitchen screen', () => {
  const pantry = sources.get('screens/PantryScreen.js');

  it('has its own element rather than a trailing clause', () => {
    // As a tail on "4 need attention this week" it was easy to miss and
    // impossible to notice changing — so resetting the trial in the
    // test controls looked like it had done nothing at all.
    //
    // Matched as the rendered element, not the word: my first version
    // checked that "trialPill" appeared anywhere in the file, which the
    // leftover stylesheet entry satisfied on its own.
    expect(/<View style=\{styles\.trialPill\}>/.test(pantry)).toBe(true);
  });

  it('and says plainly what it is', () => {
    expect(/Free trial · \{/.test(pantry)).toBe(true);
  });

  it('and the slot count does not compete with it', () => {
    expect(/trialCountdown === null && freeSlotsLeft !== null/.test(pantry)).toBe(true);
  });
});

/**
 * The app's name lives in one place.
 *
 * It was hardcoded in four user-facing strings as well as in APP_NAME,
 * which meant a rename would silently leave the old name in a camera
 * permission prompt and two purchase errors — the kind of thing nobody
 * spots until a screenshot goes out.
 */
describe('The name is defined once', () => {
  // Reads the name out of APP_NAME rather than stating it, because the
  // first version of this test hardcoded "SnapFresh" — and so broke the
  // moment the app was renamed, which is precisely the event it exists
  // to make safe.
  const legal = sources.get('services/legal.js');
  const declared = /export const APP_NAME = '([^']+)'/.exec(legal)?.[1];

  it('APP_NAME is declared', () => {
    expect(typeof declared === 'string' && declared.length > 0).toBe(true);
  });

  it('only legal.js states it literally', () => {
    const offenders = [...sources.entries()]
      .filter(([name, src]) => name !== 'services/legal.js' && src.includes(declared))
      .map(([name]) => name);
    if (offenders.length) {
      throw new Error(`hardcoded app name in: ${offenders.join(', ')}`);
    }
    expect(offenders.length).toBe(0);
  });

  it('and legal.js states it exactly once', () => {
    const count = legal.split(declared).length - 1;
    expect(count).toBe(1);
  });
});;
