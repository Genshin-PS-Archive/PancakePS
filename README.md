# pancake
A Working Genshin Impact private server hosted in your own pc.

### **WARNING**
* Please use a [VPN](https://en.wikipedia.org/wiki/Virtual_private_network) or a [Virtual Machine](https://en.wikipedia.org/wiki/Virtual_machine) while you test this project, the fiddler script should block all the logs to mihoyo's server but im not sure at all, please use this project with caution (I havent been banned for now but that doesnt mean you're not taking the risk to get banned)
* **In case you want to use this, contact me on discord (NicknameGG#0001) since this needs two more special files to work.**

# Installation
The installation assumes you have installed the next things in your pc
* [**git**](https://git-scm.com/downloads)  if you dont want to install git you can donwload the project as [.zip](https://github.com/NicknameGG/pancake/archive/refs/heads/main.zip)
* [**node-js**](https://nodejs.org/en/download/) 
* [**Fiddler**](https://www.telerik.com/download/fiddler) you can use host file

In case you dont have them, please install them otherwise you would not be able to start the server.
## Project (The Server itself)
1. clone the project using `git clone https://github.com/NicknameGG/pancake` or [download it as .zip](https://github.com/NicknameGG/pancake/archive/refs/heads/main.zip))
1. Run `modules.bat` to install the required modules
1. You can now open the project in your IDE

## Fiddler (Traffic Redirector)
1. Open fiddler and go to FiddlerScripts
![image](https://user-images.githubusercontent.com/52223947/113501027-ba59d780-94df-11eb-9b44-343a435eea67.png)
1. Copy `fiddler.cs` content and paste it into fiddler
1. Press **Save Script** button
![image](https://user-images.githubusercontent.com/52223947/113501041-d2c9f200-94df-11eb-91fd-ccfe53589c3f.png)

Now open Genshin Impact and have fun.

# Information
Im making this project to learn how to reverse data sent by the client to the server, i will work in this if i feel motivated enough to work on it, the project will be private and only me and some friends will be able to see/know about it.


# How To Play
1. Open Fiddler
1. Double click `start.bat`

**WARNING**
> **Do not close Fiddler or the console if you want to play in the server**

For now, you can **only login** using a non-existent email and password.

# TODO
* Login
![image](https://user-images.githubusercontent.com/52223947/113501273-0d805a00-94e1-11eb-8c0a-c44427e9f315.png)
* KCP Packet Handler
no image
* Announcements
![image](https://user-images.githubusercontent.com/52223947/113501296-356fbd80-94e1-11eb-8891-3d6584d097e8.png)


# Work In Progress
Be able to use other char 


# Modules Used
Modules used for this project, will be adding more.
* net - TCP Server
* http - HTTP Server
* dgram - UDP Server
* node-kcp - KCP Server
* protobuff-js - Protobuff encoding
* sqlite3 - Database reading
* udp-proxy - works as a sniffer

# Skultz
he is still gay

* [REDACTED]
