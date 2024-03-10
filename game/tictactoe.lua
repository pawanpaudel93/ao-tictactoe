local json = require("json")

-- Initialize the Board as a single-dimensional array for simplicity
Board = Board or { "1", "2", "3", "4", "5", "6", "7", "8", "9" }
Players = Players or {}
CurrentPlayer = CurrentPlayer or ""
State = State or "REGISTER"
PreviousMatches = PreviousMatches or {}


function resetState()
    Board = { "1", "2", "3", "4", "5", "6", "7", "8", "9" }
    Players = {}
    CurrentPlayer = ""
    State = "REGISTER"
end

function informPlayers(message)
    for address, _ in pairs(Players) do
        message.Target = address
        ao.send(message)
    end
end

-- Function to check if the current player has won
function checkWin()
    local wins = {
        { 1, 2, 3 }, { 4, 5, 6 }, { 7, 8, 9 }, -- Rows
        { 1, 4, 7 }, { 2, 5, 8 }, { 3, 6, 9 }, -- Columns
        { 1, 5, 9 }, { 3, 5, 7 }               -- Diagonals
    }

    for _, win in ipairs(wins) do
        if Board[win[1]] == Board[win[2]] and Board[win[2]] == Board[win[3]] then
            return true
        end
    end
    return false
end

-- Function to check if the Board is full
function checkDraw()
    for _, value in ipairs(Board) do
        if value ~= "X" and value ~= "O" then
            return false
        end
    end
    return true
end

-- Function to update the Board with the player's move
function movePlayer(player, position)
    if position and position >= 1 and position <= 9 and Board[position] ~= "X" and Board[position] ~= "O" then
        Board[position] = player
        return true
    end
    return false
end

function getPlayersCount()
    local count = 0
    for _, _ in pairs(Players) do
        count = count + 1
    end
    return count
end

function register(msg)
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
            State = "PLAY"
            informPlayers({ Action = "Play", CurrentPlayer = CurrentPlayer })
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

function makeMove(msg)
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
            resetState()
        elseif checkDraw() then
            informPlayers({ Action = "Draw", Data = json.encode({ Board = Board }) })
            table.insert(PreviousMatches, { Board = Board, Players = Players, Winner = "", State = "Draw" })
            resetState()
        else
            for address, _ in pairs(Players) do
                if address ~= msg.From then CurrentPlayer = address end
            end
            informPlayers({ Action = "CurrentTurn", Data = json.encode({ Board = Board }), CurrentPlayer = CurrentPlayer })
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

function getGameState(msg)
    local GameState = json.encode({
        State = State,
        Board = Board,
        Players = Players,
        CurrentPlayer = CurrentPlayer
    })
    ao.send({
        Target = msg.From,
        Action = "GameState",
        Data = GameState
    })
end

Handlers.add("Register", Handlers.utils.hasMatchingTag("Action", "Register"), register)
Handlers.add("MakeMove", Handlers.utils.hasMatchingTag("Action", "MakeMove"), makeMove)
Handlers.add("GetGameState", Handlers.utils.hasMatchingTag("Action", "GetGameState"), getGameState)
