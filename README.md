# AO TicTacToe

## Play on the UI

Play the game: [Demo](https://ao-tictactoe.vercel.app/)

## Play on the terminal

Create a new game process or skip this step by creating a player to play the game.

```sh
aos tictactoe

.load game/tictactoe.lua
```

Create a player

```sh
aos player1

.load game/client.lua

GameProcess = "game_process_id" # skip this step if you are playing the default game process

register() # Register to play the game

registerBot() # Register the bot to play the game

makeMove("position") # Make a move with position (1-9)
```
