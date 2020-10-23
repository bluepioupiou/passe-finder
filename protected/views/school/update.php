<?php
$this->breadcrumbs=array(
	'Ecole'=>array('index'),
	$model->name=>array('view','id'=>$model->id),
	'modifier',
);

$this->menu=array(
	array('label'=>'List School', 'url'=>array('index')),
	array('label'=>'Create School', 'url'=>array('create')),
	array('label'=>'View School', 'url'=>array('view', 'id'=>$model->id)),
	array('label'=>'Manage School', 'url'=>array('admin')),
);
?>

<h1>Modifier l'école <?php echo $model->name; ?></h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>