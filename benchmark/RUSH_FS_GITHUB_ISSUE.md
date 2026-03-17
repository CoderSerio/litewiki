---
name: 🚀 Performance Optimization: Smart Degradation for Small Directories
about: Suggest performance improvement for recursive readdir
title: '[Performance] Add smart degradation for small directory trees'
labels: 'enhancement, performance'
---

## 📊 Problem

During Rush-FS integration benchmark testing in the LiteWiki project, we discovered a performance issue with recursive `readdir` on small directory trees.

### Benchmark Results

**Test scenario**: 155 directories, 1550 files (breadth=5, depth=3)

| Implementation | Time | vs Node.js |
|----------------|------|------------|
| Node.js fs | 4.75 ms | 1.0x |
| Rush-FS (recursive calls in JS ❌) | 5.50 ms | **-0.86x** (slower!) |
| Rush-FS (`recursive: true` ✅) | 1.93 ms | **2.46x** |

### Root Cause

The current implementation always uses parallel traversal via `jwalk`:

```rust
// src/readdir.rs Lines 93-100
let walk_dir = WalkDir::new(path)
    .skip_hidden(skip_hidden)
    .parallelism(match opts.concurrency {
        Some(n) => Parallelism::RayonNewPool(n as usize),
        None => Parallelism::RayonNewPool(0),  // Always creates thread pool
    });
```

**For small directory trees**:
- Thread pool initialization overhead: ~50-100 µs
- Task scheduling overhead: ~10 µs per thread
- Parallel benefit: Not enough to offset overhead

**Result**: Performance is worse than Node.js for small projects (< 1000 files).

---

## 💡 Proposed Solution: Smart Degradation

Add intelligent fallback to serial traversal for small/shallow directory trees.

### Option A: Depth-Based Degradation (Recommended)

```rust
use std::path::Component;

fn calculate_depth(path: &Path) -> usize {
    path.components()
        .filter(|c| matches!(c, Component::Normal(_)))
        .count()
}

// In readdir function
let depth = calculate_depth(path);
let parallelism = if depth <= 2 {
    Parallelism::Serial  // Shallow directories: use serial
} else {
    match opts.concurrency {
        Some(n) => Parallelism::RayonNewPool(n as usize),
        None => Parallelism::RayonNewPool(0),
    }
};
```

### Option B: Entry Count-Based Degradation

```rust
// Quick estimate of directory size
let estimated_entries = quick_count_entries(path)?;
let parallelism = if estimated_entries < 1000 {
    Parallelism::Serial  // Small directories: use serial
} else {
    Parallelism::RayonNewPool(0)  // Large directories: use parallel
};
```

### Option C: Configurable Threshold

```rust
#[napi(object)]
pub struct ReaddirOptions {
    // ... existing fields ...
    
    /// Enable smart degradation (default: true)
    pub smart_degradation: Option<bool>,
    
    /// Parallel threshold (default: 1000)
    pub parallel_threshold: Option<u32>,
}
```

---

## 📈 Expected Benefits

### Small Scale (< 1000 files)
| Current | Optimized | Improvement |
|---------|-----------|-------------|
| 5.50 ms (slower than Node.js) | ~4.0 ms | **~1.2x faster than Node.js** |

### Large Scale (> 1000 files)
| Current | Optimized | Change |
|---------|-----------|--------|
| 1.93 ms | ~1.9 ms | No change (still fast) |

### User Experience
- ✅ Small projects no longer experience "negative optimization"
- ✅ Large projects maintain high performance
- ✅ No manual mode selection required

---

## 🔬 Testing Recommendations

### Add Multi-Scale Benchmarks

```rust
#[cfg(test)]
mod bench {
    #[bench]
    fn bench_readdir_small(b: &mut Bencher) {
        // 100 files, 10 directories
    }

    #[bench]
    fn bench_readdir_medium(b: &mut Bencher) {
        // 1000 files, 100 directories
    }

    #[bench]
    fn bench_readdir_large(b: &mut Bencher) {
        // 30000 files, 3000 directories
    }
}
```

### Test Cases
```bash
# Small scale (should auto-degrade to serial)
node -e "await rushFs.readdir('./small', { recursive: true })"

# Large scale (should use parallel)
node -e "await rushFs.readdir('./large', { recursive: true })"
```

---

## 📝 Implementation Notes

### 1. Performance Overhead
- `quick_count_entries` itself has overhead
- Recommendation: Only count first level, or skip and use depth-based

### 2. Backward Compatibility
- Enable smart degradation by default
- Add `smart_degradation: false` option to disable

### 3. Documentation
- Update README with "smart degradation" explanation
- Clarify when to use `recursive: true` vs manual recursion

---

## 🎯 Recommended Approach

**Recommend Option A (Depth-Based)** because:
1. ✅ Simple implementation, no extra counting
2. ✅ Minimal performance overhead
3. ✅ Covers most use cases

---

## 🔗 References

- jwalk documentation: https://docs.rs/jwalk/0.8.1/jwalk/struct.WalkDir.html
- Rayon parallelism: https://docs.rs/rayon/1.11.0/rayon/
- Node.js fs implementation: https://github.com/nodejs/node/blob/main/lib/fs.js

---

## 📌 Summary

**Problem**: Rush-FS forces parallel traversal for small directory trees, resulting in worse performance than Node.js

**Root Cause**: No smart degradation strategy; thread pool overhead exceeds parallel benefit

**Proposal**: Add intelligent fallback to serial for small/shallow directories

**Expected Impact**: 
- Small scale: From "negative optimization" to positive gain
- Large scale: Maintain existing advantage
- Better UX: No manual mode selection needed

---

*Discovered during LiteWiki project Rush-FS integration testing*
*2026-03-17*
