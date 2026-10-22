"""Educational DAG-Plan dispatcher, not the official authors' implementation.
Python 3.10+. Read docs/article_mapping_ru.md before presenting the results.
"""
from dataclasses import dataclass
from functools import lru_cache
from itertools import product
from math import dist, isfinite
from time import perf_counter
import json
import argparse

@dataclass(frozen=True)
class Task:
    id: str
    kind: str
    pos: tuple
    deps: tuple = ()
    chain: str = ""
    arms: int = 1
    duration: float = 1.0

class Planner:
    def __init__(self, tasks, speed=1.0, radius=10.0, span=10.0):
        self.ts = {t.id: t for t in tasks}
        self.origin = ((-1., 0.), (1., 0.))
        self.speed, self.radius, self.span = speed, radius, span
        if len(self.ts) != len(tasks): raise ValueError("Duplicate ID")
        if any(not isfinite(x) or x <= 0 for x in (speed, radius, span)): raise ValueError("Motion parameters")
        self.validate()
        self.work = frozenset(i for i, t in self.ts.items() if t.kind != "complete")
        self.external = {}
        for c in {t.chain for t in tasks if t.chain}:
            ids = {i for i,t in self.ts.items() if t.chain == c}
            self.external[c] = {d for i in ids for d in self.ts[i].deps if d not in ids}

    def validate(self):
        ts = self.ts
        for t in ts.values():
            if t.kind not in {"occupy","tool","release","operate","complete"}: raise ValueError("Kind")
            if t.arms not in (1,2) or not isfinite(t.duration) or t.duration < 0: raise ValueError("Parameters")
            if t.kind != "complete" and t.duration == 0: raise ValueError("Zero duration")
            if len(t.pos) != 2 or not all(isfinite(x) for x in t.pos): raise ValueError("Position")
            if any(d not in ts for d in t.deps): raise ValueError("Unknown dependency")
            if (t.kind in {"occupy","tool","release"}) != bool(t.chain): raise ValueError("Chain")
        done = set()
        while len(done) < len(ts):
            ready = {i for i,t in ts.items() if i not in done and set(t.deps) <= done}
            if not ready: raise ValueError("Cycle")
            done.update(ready)
        ends = [i for i,t in ts.items() if t.kind == "complete"]
        if len(ends) != 1: raise ValueError("One complete node required")
        seen, todo = set(), ends[:]
        while todo:
            i = todo.pop()
            if i not in seen:
                seen.add(i); todo.extend(ts[i].deps)
        if seen != set(ts): raise ValueError("All tasks must lead to complete")
        for c in {t.chain for t in ts.values() if t.chain}:
            group = [t for t in ts.values() if t.chain == c]
            starts = [t for t in group if t.kind == "occupy"]
            ends = [t for t in group if t.kind == "release"]
            if len(starts) != 1 or len(ends) != 1: raise ValueError("Incomplete chain")
            order = starts[:]
            while len(order) < len(group):
                nxt = [t for t in group if t not in order and order[-1].id in t.deps]
                if len(nxt) != 1: raise ValueError("Chain must be linear")
                order.append(nxt[0])
            if order[-1] != ends[0] or len({t.arms for t in group}) != 1: raise ValueError("Chain end/arms")

    def initial(self): return (frozenset(), (None,None), (None,None))

    def positions(self, s):
        return tuple(self.ts[i].pos if i is not None else self.origin[a] for a,i in enumerate(s[1]))

    def candidates(self, s, arm):
        done, _, held = s
        result = [None]
        for i in sorted(self.work-done):
            t = self.ts[i]
            if not set(t.deps) <= done: continue
            if held[arm] is not None:
                if t.chain != held[arm] or t.kind not in {"tool","release"}: continue
            elif t.kind not in {"occupy","operate"}: continue
            if t.kind == "occupy" and not self.external[t.chain] <= done: continue
            result.append(i)
        return result

    def feasible_pairs(self, s):
        result = []
        for pair in product(self.candidates(s,0), self.candidates(s,1)):
            ids = [i for i in pair if i is not None]
            if not ids or any(ids.count(i) != self.ts[i].arms for i in set(ids)): continue
            if any(dist(self.origin[a], self.ts[i].pos) > self.radius for a,i in enumerate(pair) if i is not None): continue
            if len(set(ids)) == 2:
                l,r = (self.ts[i] for i in pair)
                if l.pos[0] > r.pos[0] or dist(l.pos,r.pos) > self.span: continue
                if l.chain and l.chain == r.chain: continue
            result.append(pair)
        return result

    def distance(self, s, pair):
        pos = self.positions(s)
        return sum(dist(pos[a],self.ts[i].pos) for a,i in enumerate(pair) if i is not None)

    def elapsed(self, s, pair):
        pos = self.positions(s)
        return max((dist(pos[a],self.ts[i].pos)/self.speed+self.ts[i].duration for a,i in enumerate(pair) if i is not None), default=0.)

    def transition(self, s, pair):
        done,last,held = s
        last,held = list(last),list(held)
        for a,i in enumerate(pair):
            if i is None: continue
            t = self.ts[i]; last[a] = i
            if t.kind == "occupy": held[a] = t.chain
            elif t.kind == "release": held[a] = None
        return done | frozenset(i for i in pair if i is not None), tuple(last), tuple(held)

    def baseline_pair(self, s):
        pairs = self.feasible_pairs(s)
        if not pairs: raise RuntimeError("Deadlock or unreachable scene")
        busy = max(sum(i is not None for i in pair) for pair in pairs)
        pairs = [pair for pair in pairs if sum(i is not None for i in pair) == busy]
        return min(pairs,key=lambda pair:(self.distance(s,pair),tuple(i or "" for i in pair)))

    def run(self, mode="baseline", limit=8):
        if mode not in {"baseline","optimized"}: raise ValueError("Mode")
        if mode == "optimized" and len(self.work) > limit: raise ValueError("Exact search limited to small DAGs")
        started = perf_counter(); policy = {}
        @lru_cache(None)
        def value(s):
            if s[0] == self.work: return 0. if s[2] == (None,None) else float("inf")
            best = float("inf")
            for pair in self.feasible_pairs(s):
                cost = self.elapsed(s,pair)+value(self.transition(s,pair))
                if cost < best: best,policy[s] = cost,pair
            return best
        s,stages = self.initial(),[]
        if mode == "optimized" and value(s) == float("inf"): raise RuntimeError("No feasible schedule")
        while s[0] != self.work:
            pair = self.baseline_pair(s) if mode == "baseline" else policy[s]
            stages.append({"left":pair[0],"right":pair[1],"time":self.elapsed(s,pair),
                           "distance":self.distance(s,pair),"done_before":sorted(s[0]),"held_before":list(s[2])})
            s = self.transition(s,pair)
        if s[2] != (None,None): raise RuntimeError("Object still held")
        return {"mode":mode,"execution_seconds":sum(x["time"] for x in stages),
                "distance":sum(x["distance"] for x in stages),"stages":stages,
                "planning_ms":1000*(perf_counter()-started),"states":value.cache_info().currsize,"llm_calls":0}

def from_data(data):
    tasks = [Task(**{**t,"pos":tuple(t["pos"]),"deps":tuple(t.get("deps",()))}) for t in data["tasks"]]
    return Planner(tasks,**data.get("parameters",{}))

def load_scene(path):
    with open(path,encoding="utf-8") as f: return from_data(json.load(f))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("scene",nargs="?",default="examples/parallel.json")
    parser.add_argument("--mode",choices=["baseline","optimized","both"],default="both")
    parser.add_argument("--output")
    args = parser.parse_args(); planner = load_scene(args.scene)
    result = {m:planner.run(m) for m in ("baseline","optimized") if args.mode in (m,"both")}
    text = json.dumps(result,ensure_ascii=False,indent=2); print(text)
    if args.output:
        with open(args.output,"w",encoding="utf-8") as f: f.write(text)
