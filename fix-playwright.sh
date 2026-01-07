#!/usr/bin/env bash
set -e

echo "==== Multiplication Drill Playwright Hardening Script (Option B) ===="

# ----------------------------
# 1️⃣ Ensure dependencies exist
# ----------------------------

# echo "[1/8] Installing system dependencies (Fedora)..."

# sudo dnf -y install nodejs npm git

echo "[2/8] Installing project dependencies..."

npm install

echo "[3/8] Installing Playwright browsers..."
npx playwright install --with-deps


# ------------------------------------------------------
# 2️⃣ Add deterministic TEST MODE hook into application
# ------------------------------------------------------

echo "[4/8] Adding deterministic test hook to app (non-prod safe)..."

APP_FILE="./script.js"

if ! grep -q "__TEST_MODE__" "$APP_FILE"; then
cat >> "$APP_FILE" <<'EOF'

// ================== TEST MODE (Playwright) ==================
// When enabled, the app becomes deterministic to avoid
// flaky end-to-end tests. This does NOT affect production use.
// Toggle from tests via:  await page.addInitScript(() => window.__TEST_MODE__ = true);
if (window && window.__TEST_MODE__) {
  console.warn("[TEST MODE] deterministic behavior enabled");

  // Seedable predictable sequence used instead of Math.random
  let __testSeed = 1;
  window.__nextRand = function(min, max) {
    __testSeed = (__testSeed * 7) % 23;
    return Math.floor(min + (__testSeed % (max - min + 1)));
  };
}
EOF
fi


# -----------------------------------------------------------------
# 3️⃣ Patch multiplier generation to respect deterministic test mode
# -----------------------------------------------------------------

echo "[5/8] Making multiplier generation respect test mode..."

# Replace random multiplier selection where used
# (non-destructive: only patches Math.random-based multiplier creation)
sed -i '
s/Math\.floor(Math\.random() * ([^)]*)) + \([0-9][0-9]*\)/window.__TEST_MODE__ ? window.__nextRand(0, \1-1) + \2 : Math.floor(Math.random() * \1) + \2/g
' "$APP_FILE"


# -----------------------------------------------------------------
# 4️⃣ Update Playwright tests to enable test mode & remove timeouts
# -----------------------------------------------------------------

SPEC_FILE="./e2e/quiz.spec.ts"

echo "[6/8] Updating Playwright tests for best-practice stability..."

# Ensure test mode injected before page loads
if ! grep -q "__TEST_MODE__" "$SPEC_FILE"; then
  sed -i '/test.beforeEach/a \
    await page.addInitScript(() => window.__TEST_MODE__ = true);' "$SPEC_FILE"
fi

# Replace waitForTimeout debounced waits with deterministic expectations
sed -i 's/await page.waitForTimeout(400);/await expect(page.locator("#difficultyValue")).not.toHaveText("");/g' "$SPEC_FILE"
sed -i 's/await page.waitForTimeout(200);/await expect(page.locator("#quizButton")).toBeVisible();/g' "$SPEC_FILE"
sed -i 's/await page.waitForTimeout(100);/await expect(page.locator("#display")).toBeVisible();/g' "$SPEC_FILE"

# Long quiz cycle — instead assert state transitions instead of time
sed -i 's/await page.waitForTimeout(3500);/await expect(page.locator("#progressBar")).toBeVisible();/' "$SPEC_FILE"


# -------------------------------------------------------
# 5️⃣ Reset localStorage per test to ensure isolation
# -------------------------------------------------------

echo "[7/8] Ensuring test isolation (clear localStorage each test)..."

grep -q "localStorage.clear" "$SPEC_FILE" || sed -i '/test.beforeEach/a \
    await page.evaluate(() => localStorage.clear());' "$SPEC_FILE"


# -------------------------------------------------------
# 6️⃣ Run test suite
# -------------------------------------------------------

echo "[8/8] Running Playwright tests…"
npx playwright test

echo "🎉 DONE — Tests hardened and running deterministically!"

