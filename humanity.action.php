<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Humanity implementation : © <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * humanity.action.php
 *
 * Humanity main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/humanity/humanity/myAction.html", ...)
 *
 */
  
  
  class action_humanity extends APP_GameAction
  { 
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( self::isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "humanity_humanity";
            self::trace( "Complete reinitialization of board game" );
      }
  	}

    public function chooseWorker() {
        self::setAjaxMode();     

        $id = self::getArg("id", AT_posint, true);
        $this->game->chooseWorker($id);

        self::ajaxResponse();
    }

    public function upgradeWorker() {
        self::setAjaxMode();     

        $id = self::getArg("id", AT_posint, true);
        $this->game->upgradeWorker($id);

        self::ajaxResponse();
    }

    public function activateModule() {
        self::setAjaxMode();     

        $id = self::getArg("id", AT_posint, true);
        $this->game->activateModule($id);

        self::ajaxResponse();
    }

    public function chooseNewModule() {
        self::setAjaxMode();     

        $id = self::getArg("id", AT_posint, true);
        $this->game->chooseNewModule($id);

        self::ajaxResponse();
    }

    public function chooseRadarColor() {
        self::setAjaxMode();     

        $color = self::getArg("color", AT_posint, true);
        $this->game->chooseRadarColor($color);

        self::ajaxResponse();
    }

    public function chooseNewResearch() {
        self::setAjaxMode();     

        $id = self::getArg("id", AT_posint, true);
        $this->game->chooseNewResearch($id);

        self::ajaxResponse();
    }

    public function autoPay() {
        self::setAjaxMode();     

        $this->game->autoPay();

        self::ajaxResponse();
    }

    public function endTurn() {
        self::setAjaxMode();     

        $this->game->endTurn();

        self::ajaxResponse();
    }

    public function confirmTurn() {
        self::setAjaxMode();     

        $this->game->confirmTurn();

        self::ajaxResponse();
    }

    public function restartTurn() {
        self::setAjaxMode();     

        $this->game->restartTurn();

        self::ajaxResponse();
    }

    public function moveWorker() {
        self::setAjaxMode();     

        $x = self::getArg("x", AT_posint, true);
        $y = self::getArg("y", AT_posint, true);
        $this->game->moveWorker($x - 1000, $y - 1000);

        self::ajaxResponse();
    }

    public function confirmMoveWorkers() {
        self::setAjaxMode();     

        $this->game->confirmMoveWorkers();

        self::ajaxResponse();
    }

    public function restartMoveWorkers() {
        self::setAjaxMode();     

        $this->game->restartMoveWorkers();

        self::ajaxResponse();
    }
  }
  

