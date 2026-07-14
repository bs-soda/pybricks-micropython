# Pybricks Core Libraries & SDKs
This directory houses third-party libraries, driver packages, and the core Pybricks I/O (`pbio`) library used by the Pybricks firmware.

---

## The `btstack` Submodule Sharing Practice

Both the top-level **Pybricks firmware repository** (`pybricks-upy`) and the nested **MicroPython submodule** (`micropython`) depend on the [BTStack](https://github.com/bluekitchen/btstack) Bluetooth protocol stack. 

Under default Git configurations, these are tracked as separate nested submodules, located at:
1. `lib/btstack` (Parent Repository)
2. `micropython/lib/btstack` (Submodule Repository)

### Why We Symlink the Submodule

To streamline development and prevent dual-repository overhead, `micropython/lib/btstack` is often symlinked to the parent `lib/btstack`.

1. **Single Source of Truth:**
   Ensures that only a single copy of `btstack` exists on disk. Any modifications, Bluetooth driver fixes, or protocol configuration changes made within `lib/btstack` are instantly shared and compiled by both the parent repository's hub builds and the nested MicroPython port builds.
2. **Deduplication:**
   Saves disk space and reduces download overhead during initialization by avoiding redundant clones.
3. **No Intermediate Git Overheads:**
   Eliminates the need to commit, push, and update reference SHAs in two separate submodule definitions during active development of Bluetooth-related code.
4. **Compilation Framework Constraint:**
   Because the firmware is built using the MicroPython compilation infrastructure inside the `micropython/` subtree, the build system expects standard components to reside directly under `micropython/lib/btstack`. Since compilation cannot easily build dependencies located outside the `micropython` directory structure, symlinking the parent's `lib/btstack` into `micropython/lib/btstack` allows the compiler to access custom Pybricks Bluetooth modifications seamlessly.
5. **Preventing `hci.c` Compiler Errors:**
   If `micropython/lib/btstack` is not symlinked to `lib/btstack` (i.e. if it falls back to the default upstream MicroPython submodule code), building the firmware will fail with compiler errors inside `hci.c` (e.g. `'hci_stack_t' has no member named 'usable_packet_types_acl'`). Symlinking is required to resolve this mismatch.

---

### How to Safely Establish the Symlink

To link the submodule, you must use a relative symlink from within the `micropython/lib/` directory so that it resolves correctly on all developer setups:

```bash
# Navigate to the target directory
cd micropython/lib/

# Remove the existing submodule directory (ensure any local work is backed up/committed!)
rm -rf btstack

# Create the relative symbolic link pointing to the parent's btstack
ln -s ../../lib/btstack btstack
```

---

### Critical Git Caveat & Troubleshooting

> [!WARNING]
> Git does not support submodules in the working tree being symbolic links. 

If `micropython/lib/btstack` is a symlink, running git commands inside the `micropython` submodule directory (or running parent git commands that query submodules, such as `git status --porcelain=2`) will fail with:

```
error: expected submodule path 'lib/btstack' not to be a symbolic link
fatal: 'git status --porcelain=2' failed in submodule micropython
```

#### How to unlink and restore the repository before pushing/git status:
If you need to run `git status`, commit changes, or push code, you **must** temporarily remove the symbolic link and restore the standard submodule reference folder:

```bash
# Remove the symbolic link
rm micropython/lib/btstack

# Restore the standard submodule folder reference from Git cache
git submodule update --init --recursive
```
After you are done with the Git operations, you can re-create the symlink to resume development.
