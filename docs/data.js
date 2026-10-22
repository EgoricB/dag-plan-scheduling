window.DAG_DATA = {
  "schema_version": 1,
  "repo": "https://github.com/EgoricB/dag-plan-scheduling",
  "summary": {
    "cases": 100,
    "improved": 58,
    "equal": 42,
    "mean_relative_reduction_percent": 4.4777806698812945,
    "aggregate_reduction_percent": 4.566373762719889,
    "mean_baseline_planning_ms": 0.1946316999992348,
    "mean_optimized_planning_ms": 23.016575630000062,
    "llm_calls": 0,
    "model": "Synthetic synchronous 2D scenes, six physical operations per case, known DAG."
  },
  "scenes": {
    "parallel": {
      "scene": {
        "parameters": {
          "speed": 1.0,
          "radius": 10.0,
          "span": 10.0
        },
        "tasks": [
          {
            "id": "left_short",
            "kind": "operate",
            "pos": [
              -1,
              0
            ],
            "duration": 1
          },
          {
            "id": "left_long",
            "kind": "operate",
            "pos": [
              -2,
              0
            ],
            "duration": 10
          },
          {
            "id": "right_long",
            "kind": "operate",
            "pos": [
              1,
              0
            ],
            "duration": 9
          },
          {
            "id": "right_short",
            "kind": "operate",
            "pos": [
              2,
              0
            ],
            "duration": 1
          },
          {
            "id": "end",
            "kind": "complete",
            "pos": [
              0,
              0
            ],
            "deps": [
              "left_short",
              "left_long",
              "right_long",
              "right_short"
            ],
            "duration": 0
          }
        ]
      },
      "plans": {
        "baseline": {
          "mode": "baseline",
          "execution_seconds": 20.0,
          "distance": 2.0,
          "stages": [
            {
              "left": "left_short",
              "right": "right_long",
              "time": 9.0,
              "distance": 0.0,
              "done_before": [],
              "held_before": [
                null,
                null
              ]
            },
            {
              "left": "left_long",
              "right": "right_short",
              "time": 11.0,
              "distance": 2.0,
              "done_before": [
                "left_short",
                "right_long"
              ],
              "held_before": [
                null,
                null
              ]
            }
          ],
          "planning_ms": 0.11149700000601115,
          "states": 0,
          "llm_calls": 0
        },
        "optimized": {
          "mode": "optimized",
          "execution_seconds": 13.0,
          "distance": 3.0,
          "stages": [
            {
              "left": "left_long",
              "right": "right_long",
              "time": 11.0,
              "distance": 1.0,
              "done_before": [],
              "held_before": [
                null,
                null
              ]
            },
            {
              "left": "left_short",
              "right": "right_short",
              "time": 2.0,
              "distance": 2.0,
              "done_before": [
                "left_long",
                "right_long"
              ],
              "held_before": [
                null,
                null
              ]
            }
          ],
          "planning_ms": 2.2080560000006244,
          "states": 113,
          "llm_calls": 0
        }
      }
    },
    "holding": {
      "scene": {
        "parameters": {
          "speed": 1.0,
          "radius": 10.0,
          "span": 10.0
        },
        "tasks": [
          {
            "id": "open",
            "kind": "operate",
            "pos": [
              1,
              0
            ],
            "duration": 2
          },
          {
            "id": "take_mug",
            "kind": "occupy",
            "pos": [
              1,
              1
            ],
            "deps": [
              "open"
            ],
            "chain": "mug",
            "duration": 1
          },
          {
            "id": "put_mug",
            "kind": "release",
            "pos": [
              1,
              0
            ],
            "deps": [
              "take_mug",
              "open"
            ],
            "chain": "mug",
            "duration": 1
          },
          {
            "id": "take_apple",
            "kind": "occupy",
            "pos": [
              -1,
              1
            ],
            "chain": "apple",
            "duration": 1
          },
          {
            "id": "put_apple",
            "kind": "release",
            "pos": [
              -1,
              0
            ],
            "deps": [
              "take_apple"
            ],
            "chain": "apple",
            "duration": 1
          },
          {
            "id": "end",
            "kind": "complete",
            "pos": [
              0,
              0
            ],
            "deps": [
              "put_mug",
              "put_apple"
            ],
            "duration": 0
          }
        ]
      },
      "plans": {
        "baseline": {
          "mode": "baseline",
          "execution_seconds": 6.0,
          "distance": 4.0,
          "stages": [
            {
              "left": "take_apple",
              "right": "open",
              "time": 2.0,
              "distance": 1.0,
              "done_before": [],
              "held_before": [
                null,
                null
              ]
            },
            {
              "left": "put_apple",
              "right": "take_mug",
              "time": 2.0,
              "distance": 2.0,
              "done_before": [
                "open",
                "take_apple"
              ],
              "held_before": [
                "apple",
                null
              ]
            },
            {
              "left": null,
              "right": "put_mug",
              "time": 2.0,
              "distance": 1.0,
              "done_before": [
                "open",
                "put_apple",
                "take_apple",
                "take_mug"
              ],
              "held_before": [
                null,
                "mug"
              ]
            }
          ],
          "planning_ms": 0.08768600000053084,
          "states": 0,
          "llm_calls": 0
        },
        "optimized": {
          "mode": "optimized",
          "execution_seconds": 6.0,
          "distance": 4.0,
          "stages": [
            {
              "left": null,
              "right": "open",
              "time": 2.0,
              "distance": 0.0,
              "done_before": [],
              "held_before": [
                null,
                null
              ]
            },
            {
              "left": "take_apple",
              "right": "take_mug",
              "time": 2.0,
              "distance": 2.0,
              "done_before": [
                "open"
              ],
              "held_before": [
                null,
                null
              ]
            },
            {
              "left": "put_apple",
              "right": "put_mug",
              "time": 2.0,
              "distance": 2.0,
              "done_before": [
                "open",
                "take_apple",
                "take_mug"
              ],
              "held_before": [
                "apple",
                "mug"
              ]
            }
          ],
          "planning_ms": 0.5603500000006534,
          "states": 49,
          "llm_calls": 0
        }
      }
    }
  },
  "provenance": {
    "source": "local working-copy files; Git blob hashes before normalization",
    "files": {
      "results/summary.json": "f3d0ec776027da9a6a0007b6c728c671b0836e62",
      "examples/parallel.json": "7f92cd911c38eb58b0b3b4652b3e84247b5c35ff",
      "results/parallel.json": "3f3354b79c0c9d24c039d07a8c9a625a42c67844",
      "examples/holding.json": "899e1c9544ca33013e1d99b95aa32bda60f44526",
      "results/holding.json": "f26fd9e42837cde065c576c87d6fe5a1c5860dd5"
    }
  }
};
