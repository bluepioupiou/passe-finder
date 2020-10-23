<?php
$this->breadcrumbs=array(
	'Enchainements'=>array('index'),
	'créer',
);

$this->menu=array(
	array('label'=>'List Enchainement', 'url'=>array('index')),
	array('label'=>'Manage Enchainement', 'url'=>array('admin')),
);
?>

<h2>Créer un enchainement</h2>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>