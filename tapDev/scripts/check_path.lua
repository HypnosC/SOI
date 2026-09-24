-- ponytail: runnable check for 打工人塔防 path math
-- run: lua scripts/check_path.lua   (from tapDev/)
package.path = package.path .. ";./scripts/?.lua;./scripts/?/init.lua"
local Path = require("DagongrenTD.path")

local pts = { { x = 0, y = 0 }, { x = 100, y = 0 }, { x = 100, y = 50 } }
assert(math.abs(Path.pathLength(pts) - 150) < 0.01, "pathLength")

local tr, done, x, y = Path.advanceAlongPath(pts, 0, 50)
assert(not done and math.abs(x - 50) < 0.01 and math.abs(y) < 0.01, "mid segment")

tr, done, x, y = Path.advanceAlongPath(pts, 140, 20)
assert(done and math.abs(x - 100) < 0.01 and math.abs(y - 50) < 0.01, "end")

print("check_path.lua OK")
