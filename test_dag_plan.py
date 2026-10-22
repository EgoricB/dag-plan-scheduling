import unittest
from pathlib import Path
from dag_plan import Task, Planner, load_scene

class PlannerTests(unittest.TestCase):
    def demo(self): return load_scene(Path(__file__).parent/"examples/parallel.json")
    def test_demo(self):
        self.assertEqual(self.demo().run("baseline")["execution_seconds"],20)
        self.assertEqual(self.demo().run("optimized")["execution_seconds"],13)
    def test_baseline_distance(self):
        p=self.demo();self.assertEqual(p.baseline_pair(p.initial()),("left_short","right_long"))
    def test_holding(self):
        p=load_scene(Path(__file__).parent/"examples/holding.json")
        for mode in ("baseline","optimized"):
            s=p.initial()
            for x in p.run(mode)["stages"]:
                pair=(x["left"],x["right"]);self.assertIn(pair,p.feasible_pairs(s));s=p.transition(s,pair)
            self.assertEqual(s[2],(None,None));self.assertEqual(s[0],p.work)
    def test_external_guard(self):
        ts=[Task("open","operate",(1,0)),Task("take","occupy",(-1,0),chain="cup"),
            Task("put","release",(-1,0),("take","open"),"cup"),Task("end","complete",(0,0),("put",),duration=0)]
        p=Planner(ts);self.assertNotIn("take",p.candidates(p.initial(),0))
    def test_two_hands(self):
        ts=[Task("take","occupy",(0,0),chain="box",arms=2),Task("put","release",(0,1),("take",),"box",arms=2),
            Task("end","complete",(0,0),("put",),duration=0)]
        for x in Planner(ts).run("optimized")["stages"]:self.assertEqual(x["left"],x["right"])
    def test_fixed_workspace(self):
        p=self.demo();p.radius=.01
        for pair in p.feasible_pairs(p.initial()):
            for a,i in enumerate(pair):
                if i is not None:self.assertEqual(p.ts[i].pos,p.origin[a])
    def test_cycle(self):
        with self.assertRaises(ValueError):Planner([Task("a","operate",(0,0),("end",)),Task("end","complete",(0,0),("a",),duration=0)])
    def test_unknown_dependency(self):
        with self.assertRaises(ValueError):Planner([Task("end","complete",(0,0),("missing",),duration=0)])
    def test_duplicate(self):
        ts=list(self.demo().ts.values())
        with self.assertRaises(ValueError):Planner(ts+[ts[0]])
    def test_incomplete_chain(self):
        with self.assertRaises(ValueError):Planner([Task("take","occupy",(0,0),chain="cup"),Task("end","complete",(0,0),("take",),duration=0)])
    def test_unreachable(self):
        for mode in ("baseline","optimized"):
            p=self.demo();p.radius=.01
            with self.assertRaises(RuntimeError):p.run(mode)
    def test_size_limit(self):
        with self.assertRaises(ValueError):self.demo().run("optimized",limit=3)
    def test_no_llm(self):
        for mode in ("baseline","optimized"):self.assertEqual(self.demo().run(mode)["llm_calls"],0)
    def test_independent_enumeration(self):
        p=Planner([Task("a","operate",(-1,1),duration=3),Task("b","operate",(1,1),duration=1),
                   Task("c","operate",(-2,0),("a",),duration=2),Task("end","complete",(0,0),("b","c"),duration=0)])
        def brute(s):
            if s[0]==p.work:return 0.
            return min((p.elapsed(s,x)+brute(p.transition(s,x)) for x in p.feasible_pairs(s)),default=float("inf"))
        self.assertAlmostEqual(p.run("optimized")["execution_seconds"],brute(p.initial()))

if __name__=="__main__":unittest.main()
