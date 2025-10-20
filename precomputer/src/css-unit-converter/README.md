This directory is a fork of https://github.com/andyjansson/css-unit-converter
which is under the MIT licence

The original hasn't been updated for 5 years, and there are new CSS units since then,
so it's been forked because:
1. the code is small
2. we can add new units easily, and update the test suite to vitest
3. simplify the code by removing 'precision'
4. complicate the code by adding parsing simple 'number + CSS Unit' strings eg '12.34px'
5. Update with TS
Unfortunately the code has changed so much I'm not sure if it could be received upstream.
If there's interest in making this into a package please speak up.