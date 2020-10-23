<?php
$this->breadcrumbs=array(
	'Passes'=>array('index'),
	'créer',
);

$this->menu=array(
	array('label'=>'List Passe', 'url'=>array('index')),
	array('label'=>'Manage Passe', 'url'=>array('admin')),
);
?>

<h2>Proposer une passe</h2>

<span class="alert i_info">Tant qu'elle n'aura pas été validée, votre passe ne sera visible que pour vous</span>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>