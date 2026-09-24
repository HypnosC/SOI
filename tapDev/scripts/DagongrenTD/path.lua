-- 打工人塔防：路径数学（纯逻辑，可脱离引擎单测）
local M = {}

function M.dist(ax, ay, bx, by)
    local dx, dy = ax - bx, ay - by
    return math.sqrt(dx * dx + dy * dy)
end

function M.pathLength(pts)
    local len = 0
    for i = 2, #pts do
        len = len + M.dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y)
    end
    return len
end

--- 沿折线前进；返回新累计距离、是否到终点、插值 x/y
function M.advanceAlongPath(pts, traveled, step)
    local remain = traveled + step
    local total = 0
    for i = 2, #pts do
        local a, b = pts[i - 1], pts[i]
        local seg = M.dist(a.x, a.y, b.x, b.y)
        if remain <= total + seg then
            local t = (remain - total) / (seg > 0 and seg or 1)
            return remain, false, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t
        end
        total = total + seg
    end
    local last = pts[#pts]
    return total, true, last.x, last.y
end

return M
