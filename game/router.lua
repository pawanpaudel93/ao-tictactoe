local json = require("json")

Games = Games or {}

-- @param {table} t
table.values = function(t)
    local values = {}
    for _, value in pairs(t) do
        table.insert(values, value)
    end
    return values
end

Handlers.add(
    "Register",
    Handlers.utils.hasMatchingTag("Action", "Register"),
    function(msg)
        local processId = msg.Tags["Process-Id"]
        local gameName = msg.Tags["Game-Name"] or ("Game-" .. tostring(#Games + 1))
        assert(type(processId) == "string", "Invalid Process ID")
        assert(Games[gameName] == nil, "Game with name " .. gameName .. " already exists")

        Games[gameName] = { Id = processId, Name = gameName, Owner = msg.From }

        ao.send({ Target = msg.From, Action = "Registered" })
    end
)

Handlers.add(
    "Get-Games",
    Handlers.utils.hasMatchingTag("Action", "Get-Games"),
    function(msg)
        ao.send({ Target = msg.From, Action = "Games", Data = json.encode(table.values(Games)) })
    end
)

Handlers.add(
    "Is-Registered",
    Handlers.utils.hasMatchingTag("Action", "Is-Registered"),
    function(msg)
        local gameName = msg.Tags["Game-Name"]
        local isRegistered = Games[gameName] ~= nil
        ao.send({ Target = msg.From, Action = "Games", Data = json.encode({ isRegistered = isRegistered }) })
    end
)

Handlers.add(
    "Unregister",
    Handlers.utils.hasMatchingTag("Action", "Unregister"),
    function(msg)
        local gameName = msg.Tags["Game-Name"]
        assert(type(gameName) == "string", "Invalid Process ID")
        local game = Games[gameName]
        assert(game ~= nil, "Game not found")
        assert(msg.From == game.Owner, "You need to be the game owner to unregister!")

        Games[gameName] = nil
        ao.send({ Target = msg.From, Action = "UnRegistered" })
    end
)
