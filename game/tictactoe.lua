local json = require("json")

-- Game state
Board = Board or { "1", "2", "3", "4", "5", "6", "7", "8", "9" }
Players = Players or {}
CurrentPlayer = CurrentPlayer or ""
State = State or "REGISTER"
PreviousMatches = PreviousMatches or {}
Winner = Winner or ""

-- Possible winning conditions
local wins = {
    { 1, 2, 3 }, { 4, 5, 6 }, { 7, 8, 9 }, -- Rows
    { 1, 4, 7 }, { 2, 5, 8 }, { 3, 6, 9 }, -- Columns
    { 1, 5, 9 }, { 3, 5, 7 }               -- Diagonals
}

local function finishGame(winner)
    Players = {}
    CurrentPlayer = ""
    State = "REGISTER"
    Winner = winner
end

-- Reset game state
local function startGame()
    Board = { "1", "2", "3", "4", "5", "6", "7", "8", "9" }
    Winner = ""
    State = "PLAY"
end

-- Inform players with message
local function informPlayers(message)
    for address, _ in pairs(Players) do
        message.Target = address
        ao.send(message)
    end
end

-- Set a new current player
local function setCurrentPlayer(currentPlayer)
    for address, _ in pairs(Players) do
        if address ~= currentPlayer then CurrentPlayer = address end
    end
end

-- Check if the current player has won
local function checkWin()
    for _, win in ipairs(wins) do
        if Board[win[1]] == Board[win[2]] and Board[win[2]] == Board[win[3]] then
            return true
        end
    end
    return false
end

-- Check if the Board is full
local function checkDraw()
    for _, value in ipairs(Board) do
        if value ~= "X" and value ~= "O" then
            return false
        end
    end
    return true
end

-- Get current players count
local function getPlayersCount()
    local count = 0
    for _, _ in pairs(Players) do
        count = count + 1
    end
    return count
end

-- Find winning or blocking moves for bot
local function findWinningOrBlockingMove(symbol)
    for _, line in ipairs(wins) do
        local countSymbol = 0
        local emptyIndex = nil
        for _, pos in ipairs(line) do
            if Board[pos] == symbol then
                countSymbol = countSymbol + 1
            elseif Board[pos] ~= "X" and Board[pos] ~= "O" then
                emptyIndex = pos
            end
        end
        if countSymbol == 2 and emptyIndex then
            return emptyIndex -- Winning or blocking move found
        end
    end

    return nil -- No winning or blocking move found
end

-- Update the Board with the player's move
local function movePlayer(player, position)
    if position and position >= 1 and position <= 9 and Board[position] ~= "X" and Board[position] ~= "O" then
        Board[position] = player
        return true
    end
    return false
end

-- Update the Board with the bot's move
local function moveBot(botSymbol)
    local opponentSymbol = botSymbol == "X" and "O" or "X"

    -- Try to win
    local winMove = findWinningOrBlockingMove(botSymbol)
    if winMove then
        movePlayer(botSymbol, winMove)
        return true
    end

    -- Try to block opponent's win
    local blockMove = findWinningOrBlockingMove(opponentSymbol)
    if blockMove then
        movePlayer(botSymbol, blockMove)
        return true
    end

    -- Take center if available
    if Board[5] ~= "X" and Board[5] ~= "O" then
        movePlayer(botSymbol, 5)
        return true
    end

    -- Take any corner if available
    local corners = { 1, 3, 7, 9 }
    for _, corner in ipairs(corners) do
        if Board[corner] ~= "X" and Board[corner] ~= "O" then
            movePlayer(botSymbol, corner)
            return true
        end
    end

    -- Take any open space
    for i = 1, 9 do
        if Board[i] ~= "X" and Board[i] ~= "O" then
            movePlayer(botSymbol, i)
            return true
        end
    end

    return false -- No move made (board is full)
end

-- Handlers

-- Handler to register the game
local function register(msg)
    local playersCount = getPlayersCount()
    assert(State == "REGISTER", "Game is already started!")
    assert(Players[msg.From] == nil, "Player already registered!")
    assert(playersCount < 2, "Game already full!")


    if (playersCount <= 2) then
        local symbol = getPlayersCount() == 0 and "X" or "O"
        Players[msg.From] = symbol

        if CurrentPlayer == "" then CurrentPlayer = msg.From end

        ao.send({
            Target = msg.From,
            Action = "Registered",
            Symbol = symbol
        })

        if (getPlayersCount() == 2) then
            startGame()
            informPlayers({ Action = "Play", ["Current-Player"] = CurrentPlayer, Symbol = symbol })
        end
    else
        ao.send({
            Target = msg.From,
            Action = "Register-Error",
            ["Message-Id"] = msg.id,
            Error = "Game already occupied!"
        })
    end
end

-- Handler to register Bot
local function registerBot(msg)
    local playersCount = getPlayersCount()
    assert(State == "REGISTER", "Game is already started!")
    assert(Players[ao.id] == nil, "Player already registered!")
    assert(playersCount < 2, "Game already full!")


    if (playersCount <= 2) then
        local symbol = getPlayersCount() == 0 and "X" or "O"
        Players[ao.id] = symbol

        setCurrentPlayer(ao.id)
        ao.send({
            Target = ao.id,
            Action = "Registered",
            Symbol = symbol
        })

        if (getPlayersCount() == 2) then
            startGame()
            informPlayers({ Action = "Play", ["Current-Player"] = CurrentPlayer, Symbol = symbol })
        end
    else
        ao.send({
            Target = msg.From,
            Action = "Register-Error",
            ["Message-Id"] = msg.id,
            Error = "Game already occupied!"
        })
    end
end

-- Make player move to position
local function makeMove(msg)
    assert(type(msg.Tags.Position) == 'string', 'Position is required!')
    assert(Players[msg.From] ~= nil, "Player is not registered to play!")
    assert(getPlayersCount() == 2, "Two players are not registered to play!")
    assert(msg.From == CurrentPlayer, "This is not your turn!")
    assert(State == "PLAY", "Game is not started or already completed!")

    local position = tonumber(msg.Tags.Position)
    local playerSymbol = Players[msg.From]

    if movePlayer(playerSymbol, position) then
        if checkWin() then
            informPlayers({ Action = "Winner", Winner = msg.From, Data = json.encode({ Board = Board }) })
            table.insert(PreviousMatches, { Board = Board, Players = Players, Winner = msg.From, State = "Win" })
            finishGame(msg.From)
        elseif checkDraw() then
            informPlayers({ Action = "Draw", Data = json.encode({ Board = Board }) })
            table.insert(PreviousMatches, { Board = Board, Players = Players, Winner = "", State = "Draw" })
            finishGame("")
        else
            setCurrentPlayer(msg.From)
            informPlayers({
                Action = "Current-Turn",
                Data = json.encode({ Board = Board }),
                ["Current-Player"] =
                    CurrentPlayer
            })
        end
    else
        ao.send({
            Target = msg.From,
            Action = "Position-Error",
            ["Message-Id"] = msg.id,
            Error = "Invalid position, try again"
        })
    end
end

-- Make bot move to position
local function makeBotMove(msg)
    assert(Players[ao.id] ~= nil, "Bot is not registered to play!")
    assert(getPlayersCount() == 2, "Two players are not registered to play!")
    assert(ao.id == CurrentPlayer, "This is not bot turn!")
    assert(State == "PLAY", "Game is not started or already completed!")

    local botSymbol = Players[ao.id]

    if moveBot(botSymbol) then
        if checkWin() then
            informPlayers({ Action = "Winner", Winner = ao.id, Data = json.encode({ Board = Board }) })
            table.insert(PreviousMatches, { Board = Board, Players = Players, Winner = ao.id, State = "Win" })
            finishGame(ao.id)
        elseif checkDraw() then
            informPlayers({ Action = "Draw", Data = json.encode({ Board = Board }) })
            table.insert(PreviousMatches, { Board = Board, Players = Players, Winner = "", State = "Draw" })
            finishGame("")
        else
            setCurrentPlayer(ao.id)
            informPlayers({
                Action = "Current-Turn",
                Data = json.encode({ Board = Board }),
                ["Current-Player"] = CurrentPlayer
            })
        end
    else
        ao.send({
            Target = ao.id,
            Action = "Position-Error",
            ["Message-Id"] = msg.id,
            Error = "Invalid position, try again"
        })
    end
end

-- Get Game state
local function getGameState(msg)
    local GameState = json.encode({
        State = State,
        Board = Board,
        Players = Players,
        CurrentPlayer = CurrentPlayer,
        Winner = Winner
    })
    ao.send({
        Target = msg.From,
        Action = "Game-State",
        Data = GameState
    })
end

Handlers.add("Register", Handlers.utils.hasMatchingTag("Action", "Register"), register)
Handlers.add("RegisterBot", Handlers.utils.hasMatchingTag("Action", "Register-Bot"), registerBot)
Handlers.add("MakeMove", Handlers.utils.hasMatchingTag("Action", "Make-Move"), makeMove)
Handlers.add("MakeBotMove", function(msg)
    return msg.Tags.Action == "Current-Turn" and msg.Tags["Current-Player"] == ao.id
end, makeBotMove)
Handlers.add("GetGameState", Handlers.utils.hasMatchingTag("Action", "Get-Game-State"), getGameState)
