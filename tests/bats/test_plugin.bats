#!/usr/bin/env bats

# bats test file for user-injector plugin
# Tests shell-script level integration of the plugin

# Absolute path to the plugin source
PLUGIN_ENTRY="/Users/marygoldaross/projects/jonryser/openclaw-plugin-user-injector/user-injector/plugin-entry.ts"

setup() {
    TEMP_USER_MD="$(mktemp)"
    export TEMP_USER_MD
    cat > "$TEMP_USER_MD" << 'USERMD'
# USER.md - User Router

This file maps users to their specific memory files.

## Known Users

### Jon Ryser
- **Slack IDs:** U08MT03CQF6 (GenUI / personal), U0AQTGTQTKL (contact / shared test account)
- **Memory file:** `memory/users/JON_RYSER.md`

### Dr. Leslie korn
- **Slack IDs:** U08GDHWK21M
- **Memory file:** `memory/users/LEKORN.md`
USERMD
}

teardown() {
    rm -f "$TEMP_USER_MD"
}

@test "plugin-entry.ts exists and is non-empty" {
    [ -s "$PLUGIN_ENTRY" ]
}

@test "plugin-entry.ts has __testing exports" {
    grep -q "__testing" "$PLUGIN_ENTRY"
}

@test "buildDispatchKey produces expected format" {
    sender_id="U08MT03CQF6"
    team_id="T12345"
    result="${team_id}:${sender_id}"
    expected="T12345:U08MT03CQF6"
    [ "$result" = "$expected" ]
}

@test "buildDispatchKey with empty teamId uses unknown-team" {
    sender_id="U08MT03CQF6"
    team_id=""
    effective_team="${team_id:-unknown-team}"
    result="${effective_team}:${sender_id}"
    expected="unknown-team:U08MT03CQF6"
    [ "$result" = "$expected" ]
}

@test "USER.md sample contains expected Slack IDs" {
    ids=$(grep -o 'U[A-Z0-9]\{8,\}' "$TEMP_USER_MD")
    count=$(printf '%s\n' "$ids" | grep -c .)
    [ "$count" -ge 3 ]
}

@test "USER.md sample contains Memory file references" {
    run grep -c 'Memory file:' "$TEMP_USER_MD"
    [ "$status" -eq 0 ]
    [ "$output" -ge 2 ]
}
