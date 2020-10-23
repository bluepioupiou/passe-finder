<?php
$this->breadcrumbs=array(
	'Positions'=>array('index'),
	'créer',
);

$this->menu=array(
	array('label'=>'List Position', 'url'=>array('index')),
	array('label'=>'Manage Position', 'url'=>array('admin')),
);
?>

<h2>Proposer une position</h2>
<span class="alert i_info">Tant qu'elle n'aura pas été validée, votre position ne sera visible que pour vous</span>
<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>