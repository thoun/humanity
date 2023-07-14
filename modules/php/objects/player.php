<?php

class HumanityPlayer {
    public int $id;
    public string $name;
    public string $color;
    public int $no;
    public int $score;
    public int $researchPoints;
    public int $science;

    public function __construct($dbPlayer) {
        $this->id = intval($dbPlayer['player_id']);
        $this->name = $dbPlayer['player_name'];
        $this->color = $dbPlayer['player_color'];
        $this->no = intval($dbPlayer['player_no']);
        $this->score = intval($dbPlayer['player_score']);
        $this->researchPoints = intval($dbPlayer['player_research_points']);
        $this->science = intval($dbPlayer['player_science']);
    }
}
?>