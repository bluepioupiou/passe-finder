<?php
$this->breadcrumbs=array(
	'Enchainements'=>array('index'),
	$model->name=>array('view','id'=>$model->id),
	'Mise à jour',
);

$this->menu=array(
	array('label'=>'List Enchainement', 'url'=>array('index')),
	array('label'=>'Create Enchainement', 'url'=>array('create')),
	array('label'=>'View Enchainement', 'url'=>array('view', 'id'=>$model->id)),
	array('label'=>'Manage Enchainement', 'url'=>array('admin')),
);
?>

<h1>Mise à jour de l'enchaînement :</h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>