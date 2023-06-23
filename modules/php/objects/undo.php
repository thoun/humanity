<?php

class Undo {
    public array $tilesIds;
    public array $tokensIds;
    public ?array $payOneLess;

    public function __construct(array $tilesIds, array $tokensIds, ?array $payOneLess) {
        $this->tilesIds = $tilesIds;
        $this->tokensIds = $tokensIds;
        $this->payOneLess = $payOneLess;
    }

}
?>