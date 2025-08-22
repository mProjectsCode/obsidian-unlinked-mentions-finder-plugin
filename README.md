# Unlinked Mentions Finder

This plugin for Obsidian adds a view to find unlinked mentions across your entire vault.

## Frontmatter Fields

Special frontmatter properties can be used to alter the plugins behavior regarding a specific note.

- `ulmf_ignore: true` makes the plugin ignore unlinked mentions of this note. Same as setting both `ulmf_ignore_title` and `ulmf_ignore_aliases` to `true`.
- `ulmf_case_sensitive: true` makes the unlinked mentions of this note case sensitive
- `ulmf_ignore_title: true` makes the plugin ignore the note title when searching for unlinked mentions of this note
- `ulmf_ignore_aliases: true` makes the plugin ignore the aliases when searching for unlinked mentions of this note

## Unlinked Header Mentions

The plugin can also find unlinked header mentions that follow the Pathfinder 2e dungeon room format (very specific, but that is what I need).

Headings in the form of `A12 - Foo` are recognized and mentions in the same note to `A12` are detected. Sub-rooms like `B2a` are also supported.
