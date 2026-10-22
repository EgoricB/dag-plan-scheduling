from pathlib import Path
import csv, json, random
from dag_plan import Task, Planner

def scene(seed):
    rng=random.Random(seed); tasks=[]
    for side,sign in (("L",-1),("R",1)):
        for k in range(3):
            deps=(f"{side}{k-1}",) if k>0 and seed%3==0 else ()
            tasks.append(Task(f"{side}{k}","operate",(sign*rng.uniform(1,3),rng.uniform(0,1)),deps,duration=rng.randint(1,10)))
    return tasks+[Task("end","complete",(0,0),tuple(t.id for t in tasks),duration=0)]

def replay(p,result):
    s=p.initial()
    for step in result["stages"]:
        pair=(step["left"],step["right"])
        assert pair in p.feasible_pairs(s)
        assert abs(step["time"]-p.elapsed(s,pair))<1e-9
        s=p.transition(s,pair)
    assert s[0]==p.work and s[2]==(None,None)

def evaluate():
    rows=[]
    for seed in range(100):
        p=Planner(scene(seed));a,b=p.run("baseline"),p.run("optimized")
        replay(p,a);replay(p,b)
        assert b["execution_seconds"]<=a["execution_seconds"]+1e-8
        rows.append({"seed":seed,"baseline_seconds":a["execution_seconds"],"optimized_seconds":b["execution_seconds"],
                     "reduction_percent":100*(1-b["execution_seconds"]/a["execution_seconds"]),
                     "baseline_planning_ms":a["planning_ms"],"optimized_planning_ms":b["planning_ms"],"optimized_states":b["states"]})
    summary={"cases":100,"improved":sum(r["reduction_percent"]>1e-7 for r in rows),
             "equal":sum(abs(r["reduction_percent"])<=1e-7 for r in rows),
             "mean_relative_reduction_percent":sum(r["reduction_percent"] for r in rows)/100,
             "aggregate_reduction_percent":100*(1-sum(r["optimized_seconds"] for r in rows)/sum(r["baseline_seconds"] for r in rows)),
             "mean_baseline_planning_ms":sum(r["baseline_planning_ms"] for r in rows)/100,
             "mean_optimized_planning_ms":sum(r["optimized_planning_ms"] for r in rows)/100,"llm_calls":0,
             "model":"Synthetic synchronous 2D scenes, six physical operations per case, known DAG."}
    return rows,summary

if __name__=="__main__":
    rows,summary=evaluate();dest=Path(__file__).parent/"results";dest.mkdir(exist_ok=True)
    with (dest/"benchmark.csv").open("w",newline="",encoding="utf-8-sig") as f:
        w=csv.DictWriter(f,fieldnames=rows[0]);w.writeheader();w.writerows(rows)
    (dest/"summary.json").write_text(json.dumps(summary,indent=2),encoding="utf-8")
    print(json.dumps(summary,indent=2))
