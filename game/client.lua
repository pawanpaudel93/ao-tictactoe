local json = require("json")

GameProcess = "DmwzscUB2NejQ9PZpRSaVhYRtgY6wV8_ffmGyJjWmZA"

-- Function to print the current state of the board
local function printBoard(board)
    for i = 1, #board, 3 do
        print(board[i] .. " | " .. board[i + 1] .. " | " .. board[i + 2])
        if i < 7 then
            print("---------")
        end
    end
    print() -- New line for better spacing
end

function register()
    Send({ Target = GameProcess, Action = "Register" })
end

function makeMove(position)
    Send({ Target = GameProcess, Action = "MakeMove", Position = position })
end

function registerBot()
    Send({ Target = GameProcess, Action = "RegisterBot" })
end

Handlers.add(
    "GameState",
    Handlers.utils.hasMatchingTag("Action", "GameState"),
    function(msg)
        local Data = json.decode(msg.Data)
        local playerSymbol = Data.Players[ao.id]
        if (playerSymbol ~= nil) then
            function Prompt()
                return "Player[" .. playerSymbol .. "]@aos> "
            end

            printBoard(Data.Board)
            if (Data.CurrentPlayer == ao.id) then
                print("\nIt's your turn. Choose a position (1-9):\n")
            else
                print("\nIt's your opponent turn.\n")
            end
        end
    end
)

Handlers.add(
    "Registered",
    Handlers.utils.hasMatchingTag("Action", "Registered"),
    function(msg)
        print("You have registered to the game. Your symbol is " .. msg.Tags.Symbol .. "\n")
        function Prompt()
            return "Player[" .. msg.Tags.Symbol .. "]@aos> "
        end
    end
)

Handlers.add(
    "Register-Error",
    Handlers.utils.hasMatchingTag("Action", "Register-Error"),
    function(msg)
        print(msg.Tags.Error .. "\n")
    end
)

Handlers.add(
    "Position-Error",
    Handlers.utils.hasMatchingTag("Action", "Position-Error"),
    function(msg)
        print(msg.Tags.Error .. "\n")
    end
)

Handlers.add(
    "Winner",
    Handlers.utils.hasMatchingTag("Action", "Winner"),
    function(msg)
        local Data = json.decode(msg.Data)
        printBoard(Data.Board)
        if (ao.id == msg.Tags.Winner) then
            print("\nYou have won the game.\n")
        else
            print("\nYou have lost the game.\n")
        end
    end
)

Handlers.add(
    "Play",
    Handlers.utils.hasMatchingTag("Action", "Play"),
    function(msg)
        printBoard({ "1", "2", "3", "4", "5", "6", "7", "8", "9" })
        print("\nThe game has started.\n")
        if (msg.Tags.CurrentPlayer == ao.id) then
            print("It's your turn. Choose a position (1-9):\n")
        else
            print("It's your opponent turn.\n")
        end
    end
)

Handlers.add(
    "Draw",
    Handlers.utils.hasMatchingTag("Action", "Draw"),
    function(msg)
        local Data = json.decode(msg.Data)
        printBoard(Data.Board)
        print("\nThe game has ended in a Draw.\n")
    end
)

Handlers.add(
    "Register-Error",
    Handlers.utils.hasMatchingTag("Action", "Draw"),
    function(msg)
        print("Game ended with a Draw.\n")
    end
)

Handlers.add(
    "CurrentTurn",
    Handlers.utils.hasMatchingTag("Action", "CurrentTurn"),
    function(msg)
        local Data = json.decode(msg.Data)
        printBoard(Data.Board)
        if (msg.Tags.CurrentPlayer == ao.id) then
            print("\nIt's your turn. Choose a position (1-9):\n")
        else
            print("\nIt's your opponent turn.\n")
        end
    end
)

Send({ Target = GameProcess, Action = "GetGameState" })
